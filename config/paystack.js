const paystack = require('paystack-api')(process.env.PAYSTACK_SECRET_TESTKEY);
const axios = require('axios');

// Initialize Paystack
const initializePayment = async (email, amount, metadata = {}) => {
  try {
    const response = await paystack.transaction.initialize({
      email,
      amount: amount * 100, // Paystack uses kobo (multiply by 100)
      metadata
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Verify Payment
const verifyPayment = async (reference) => {
  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_TESTKEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data || !response.data.status) {
      throw new Error('Invalid Paystack response structure');
    }

    return {
      status: response.data.status,
      message: response.data.message,
      data: {
        reference: response.data.data.reference,
        amount: response.data.data.amount / 100, // Convert from kobo
        status: response.data.data.status,
        metadata: response.data.data.metadata || {}
      }
    };
  } catch (error) {
    console.error('Paystack verification failed:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Payment verification failed');
  }
};

// Create Transfer Recipient
const createTransferRecipient = async (data) => {
  try {
    const response = await axios.post(
      'https://api.paystack.co/transferrecipient',
      data,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_TESTKEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Create recipient error:', error.response?.data || error.message);
    throw error;
  }
};

const initiateTransfer = async (data) => {
  try {
    const response = await axios.post(
      'https://api.paystack.co/transfer',
      data,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_TESTKEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Transfer initiation error:', error.response?.data || error.message);
    throw error;
  }
};

// Currency Conversion (using a third-party API)
const convertCurrency = async (from, to, amount) => {
  try {
    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from}`);
    const rate = response.data.rates[to];
    return amount * rate;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  initializePayment,
  verifyPayment,
  createTransferRecipient,
  initiateTransfer,
  convertCurrency
};