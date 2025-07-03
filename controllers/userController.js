const User = require('../models/User');
const Card = require('../models/Card');
const Transaction = require('../models/Transaction');

// @desc    Get user dashboard
// @route   GET /users/dashboard
exports.getDashboard = async (req, res) => {
  if(!req.session.user){
    return res.redirect('/login');
  }
  try {
    const user = await User.findById(req.session.user._id);
    const cards = await Card.find({ user: req.session.user._id });
    const transactions = await Transaction.find({ user: req.session.user._id })
      .sort('-createdAt')
      .limit(5);

    res.render('users/dashboard', {
      user,
      cards,
      transactions
    });
  } catch (err) {
    console.error(err);
    res.render('error', { error: 'Failed to load dashboard' });
  }
};

// @desc    Get user profile
// @route   GET /users/profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);
    
    res.render('users/profile', {
      user,
      error: req.flash('error')[0] || null,  // Add error handling
      success: req.flash('success')[0] || null
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load profile');
    res.redirect('/users/dashboard');
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { firstName, lastName, email },
      { new: true, runValidators: true }
    );

    req.flash('success', 'Profile updated successfully');
    res.redirect('/users/profile');
  } catch (err) {
    console.error(err);
    req.flash('error', err.message);
    req.flash('formData', req.body);
    res.redirect('/users/profile');
  }
};

// @desc    Add bank account
// @route   POST /users/bank-accounts
exports.addBankAccount = async (req, res) => {
  try {
    const { bankCode, accountNumber, accountName } = req.body;
    const user = await User.findById(req.session.user._id);

    // Check if account already exists
    const existingAccount = user.bankAccounts.find(
      acc => acc.accountNumber === accountNumber
    );
    
    if (existingAccount) {
      req.flash('error', 'Bank account already exists');
      return res.redirect('/users/profile');
    }

    user.bankAccounts.push({
      bankCode,
      accountNumber,
      accountName,
      isDefault: user.bankAccounts.length === 0 // Set as default if first account
    });

    await user.save();
    req.flash('success', 'Bank account added successfully');
    res.redirect('/users/profile');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to add bank account');
    res.redirect('/users/profile');
  }
};

exports.setDefaultBankAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Reset all accounts to non-default
    user.bankAccounts.forEach(account => {
      account.isDefault = false;
    });
    
    // Set the selected account as default
    const account = user.bankAccounts.id(req.params.accountId);
    if (account) {
      account.isDefault = true;
    }
    
    await user.save();
    req.flash('success', 'Default bank account updated');
    res.redirect('/users/profile');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to set default account');
    res.redirect('/users/profile');
  }
};

exports.deleteBankAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Check if trying to delete default account
    const account = user.bankAccounts.id(req.params.accountId);
    if (account && account.isDefault && user.bankAccounts.length > 1) {
      req.flash('error', 'Cannot delete default account. Set another as default first.');
      return res.redirect('/users/profile');
    }
    
    user.bankAccounts.pull(req.params.accountId);
    await user.save();
    
    req.flash('success', 'Bank account deleted');
    res.redirect('/users/profile');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to delete bank account');
    res.redirect('/users/profile');
  }
};