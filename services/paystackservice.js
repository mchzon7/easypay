const axios = require('axios');

class PaystackService {
  constructor(secretKey) {
    this.api = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async createVirtualCard(customerEmail, currency = 'NGN', amount = 0) {
    try {
      const response = await this.api.post('/dedicated_account', {
        customer: customerEmail,
        preferred_bank: "wema-bank", // Example bank
        currency: currency
      });

      return response.data.data;
    } catch (error) {
      console.error('Paystack virtual card error:', error.response?.data || error.message);
      throw new Error('Failed to create virtual card');
    }
  }

  async fundVirtualCard(cardId, amount) {
    try {
      const response = await this.api.post('/dedicated_account/fund', {
        dedicated_account_id: cardId,
        amount: amount * 100 // Convert to kobo
      });
      return response.data.data;
    } catch (error) {
      console.error('Paystack funding error:', error.response?.data || error.message);
      throw new Error('Failed to fund virtual card');
    }
  }
}

module.exports = new PaystackService(process.env.PAYSTACK_SECRET_KEY);