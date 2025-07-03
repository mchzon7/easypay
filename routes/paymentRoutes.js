const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const axios = require('axios');
const paystack = require('../config/paystack');
const { checkAuthenticated } = require('../middleware/authMiddleware');

// Deposit Routes
router.post('/paystack/webhook', paymentController.handlePaystackWebhook);
router.get('/deposit', async (req, res) => {

 res.render('payments/deposit', {
    user: req.session.user,
    paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY
 });

});

router.post('/deposit',  paymentController.deposit);
router.get('/verify/:reference',  paymentController.verifyDeposit);

// Withdrawal Routes
router.get('/withdraw', paymentController.getWithdrawPage );
router.post('/withdraw',  paymentController.withdraw);

// Transfer Routes
router.get('/send', paymentController.getSendPage);
router.post('/send',  paymentController.sendPayment);

// Currency Conversion Routes
router.post('/convert',  paymentController.convertCurrency);

router.get('/resolve-account', async (req, res) => {
  try {
    const { bankCode, accountNumber } = req.query;
    
    const response = await axios.get(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );
    
    res.json({ accountName: response.data.data.account_name });
  } catch (error) {
    console.error('Account resolution error:', error.response?.data || error.message);
    res.status(400).json({ error: 'Could not resolve account details' });
  }
});


module.exports = router;