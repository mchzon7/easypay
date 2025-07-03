const User = require('../models/User');
const Card = require('../models/Card');
const Transaction = require('../models/Transaction');
const paystack = require('../config/paystack');
const crypto = require('crypto');


// WEBHOOK

exports.handlePaystackWebhook = async (req, res) => {
  try {
    // Validate webhook signature
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_TESTKEY)
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).send('Invalid signature');
    }

    const event = req.body;
    
    // Handle successful charge events
    if (event.event === 'charge.success') {
      const { reference, amount, customer } = event.data;
      
      // Find user by customer email
      const user = await User.findOne({ email: customer.email });
      if (!user) {
        return res.status(404).send('User not found');
      }

      // Convert amount from kobo to Naira
      const depositAmount = amount / 100;
      
      // Update user balance
      user.balance += depositAmount;
      await user.save();

      // Record transaction
      await Transaction.create({
        user: user._id,
        amount: depositAmount,
        type: 'deposit',
        status: 'completed',
        reference: reference,
        metadata: event.data
      });

      return res.status(200).send('Webhook processed');
    }

    res.status(200).send('Event not processed');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Error processing webhook');
  }
};
// @desc    Deposit funds
// @route   POST /payments/deposit
exports.deposit = async (req, res) => {
  try {
    const { email, amount } = req.body;
    
    // Initialize payment with Paystack
    const paymentData = await paystack.initializePayment(email, amount, {
      userId: req.session.user._id
    });
    
    res.render('payments/deposit', {
      paymentData,
      paystackPublicKey: process.env.PAYSTACK_PUBLIC_TESTKEY
    });
  } catch (err) {
    console.error(err);
    res.render('error', { error: 'Deposit failed' });
  }
};

// @desc    Verify deposit
// @route   GET /payments/verify/:reference
exports.verifyDeposit = async (req, res) => {
  try {
    const { reference } = req.params;
    const payment = await paystack.verifyPayment(reference);

    if (payment.status !== 'success') {
      return res.render('error', { error: 'Payment verification failed' });
    }

    const amount = payment.amount / 100; // Convert from kobo
    const user = await User.findOne({ email: payment.customer.email });

    if (!user) {
      return res.render('error', { error: 'User not found' });
    }

    // Check if this transaction was already processed
    const existingTx = await Transaction.findOne({ reference: payment.reference });
    if (existingTx) {
      return res.redirect('/users/dashboard');
    }

    // Update balance
    user.balance += amount;
    await user.save();

    // Record transaction
    await Transaction.create({
      user: user._id,
      amount: amount,
      type: 'deposit',
      status: 'completed',
      reference: payment.reference,
      metadata: payment
    });

    res.redirect('/users/dashboard');
  } catch (err) {
    console.error('Deposit verification error:', err);
    res.render('error', { error: 'Payment verification failed' });
  }
};

// Get Withrawal page
exports.getWithdrawPage = async (req, res) => {
  try {
    // Ensure user is populated with bankAccounts
    const user = await User.findById(req.session.user._id).select('+bankAccounts');
    
    if (!user) {
      return res.redirect('/auth/login');
    }

    res.render('payments/withdraw', { 
      user: {
        ...user.toObject(),
        balance: user.balance || 0,
        bankAccounts: user.bankAccounts || []
      }
    });
  } catch (err) {
    console.error(err);
    res.redirect('/users/dashboard');
  }
};
// @desc    Withdraw funds
// @route   POST /payments/withdraw
exports.withdraw = async (req, res) => {
  try {
    const { amount, bankCode, accountNumber } = req.body;
    const amountNum = parseFloat(amount);
    const user = await User.findById(req.session.user._id);

    // Validate amount
    if (isNaN(amountNum)) {
      req.flash('error', 'Please enter a valid amount');
      return res.redirect('/payments/withdraw');
    }

    if (amountNum < 100) {
      req.flash('error', 'Minimum withdrawal is ₦100');
      return res.redirect('/payments/withdraw');
    }

    if (amountNum > user.balance) {
      req.flash('error', 'Insufficient balance for withdrawal');
      return res.redirect('/payments/withdraw');
    }

    // Verify bank account
    if (!user.bankAccounts.some(acc => acc.accountNumber === accountNumber)) {
      req.flash('error', 'Selected bank account not found');
      return res.redirect('/payments/withdraw');
    }

    // Create transfer recipient
    const recipient = await paystack.createTransferRecipient({
      type: 'nuban',
      name: `${user.firstName} ${user.lastName}`,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: 'NGN'
    });

    // Initiate transfer
    const transfer = await paystack.initiateTransfer({
      source: 'balance',
      amount: amountNum * 100, // Convert to kobo
      recipient: recipient.recipient_code,
      reason: 'Withdrawal'
    });

    // Update user balance
    user.balance -= amountNum;
    await user.save();

    // Record transaction
    await Transaction.create({
      user: user._id,
      amount: amountNum,
      type: 'withdrawal',
      status: 'pending',
      reference: transfer.reference,
      bankDetails: {
        bankCode,
        accountNumber,
        accountName: `${user.firstName} ${user.lastName}`
      }
    });

    req.flash('success', `Withdrawal of ₦${amountNum.toLocaleString()} initiated`);
    res.redirect('/users/dashboard');
  } catch (err) {
    console.error('Withdrawal error:', err);
    req.flash('error', err.response?.data?.message || 'Withdrawal failed');
    res.redirect('/payments/withdraw');
  }
};

// @desc    Send payment to another user
// @route   POST /payments/send
exports.getSendPage = async (req, res) => {
  try {
    // Ensure user is populated with balance
    const user = await User.findById(req.session.user._id).select('balance');
    
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/auth/login');
    }

    res.render('payments/send', { 
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        balance: user.balance || 0  // Ensure balance exists
      }
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load send money page');
    res.redirect('/users/dashboard');
  }
};

exports.sendPayment = async (req, res) => {
  try {
    const { email, amount } = req.body;
    const amountNum = parseFloat(amount);
    const sender = await User.findById(req.session.user._id);
    const recipient = await User.findOne({ email });

    // Validate all parameters
    if (!sender || !recipient) {
      req.flash('error', !sender ? 'Sender not found' : 'Recipient not found');
      return res.redirect('/payments/send');
    }

    if (isNaN(amountNum)) {
      req.flash('error', 'Invalid amount');
      return res.redirect('/payments/send');
    }

    if (amountNum <= 0) {
      req.flash('error', 'Amount must be greater than 0');
      return res.redirect('/payments/send');
    }

    if (amountNum > sender.balance) {
      req.flash('error', 'Insufficient balance');
      return res.redirect('/payments/send');
    }

    // Process the transfer
    sender.balance -= amountNum;
    recipient.balance += amountNum;

    await Promise.all([sender.save(), recipient.save()]);

    // Record transactions
    await Transaction.create([
      {
        user: sender._id,
        amount: amountNum,
        type: 'transfer',
        status: 'completed',
        reference: `TRF-${Date.now()}`,
        recipient: recipient._id
      },
      {
        user: recipient._id,
        amount: amountNum,
        type: 'deposit',
        status: 'completed',
        reference: `TRF-${Date.now()}`,
        sender: sender._id
      }
    ]);

    req.flash('success', `Successfully sent ₦${amountNum.toLocaleString()} to ${recipient.email}`);
    res.redirect('/users/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to send payment');
    res.redirect('/payments/send');
  }
};

// @desc    Convert currency
// @route   POST /payments/convert
exports.convertCurrency = async (req, res) => {
  try {
    const { from, to, amount } = req.body;
    const user = await User.findById(req.session.user._id);
    
    // Check if user has sufficient balance
    if (user.currency !== from || user.balance < amount) {
      return res.render('error', { error: 'Insufficient balance or currency mismatch' });
    }
    
    // Convert currency
    const convertedAmount = await paystack.convertCurrency(from, to, amount);
    
    // Update user balance and currency
    user.balance = convertedAmount;
    user.currency = to;
    await user.save();
    
    // Create transaction record
    await Transaction.create({
      user: user._id,
      amount,
      type: 'conversion',
      status: 'completed',
      reference: `CNV-${Date.now()}`,
      details: `Converted ${amount} ${from} to ${convertedAmount} ${to}`
    });
    
    res.redirect('/users/dashboard');
  } catch (err) {
    console.error(err);
    res.render('error', { error: 'Currency conversion failed' });
  }
};

