const mongoose = require('mongoose');

const CardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Paystack card details
  cardId: {
    type: String,
    required: true
  },
  cardPan: {
    type: String,
    required: true
  },
  maskedPan: {
    type: String,
    required: true
  },
  cvv: {
    type: String,
    required: true
  },
  expiryMonth: {
    type: String,
    required: true
  },
  expiryYear: {
    type: String,
    required: true
  },
  cardType: {
    type: String,
    enum: ['visa', 'mastercard'],
    required: true
  },
  currency: {
    type: String,
    default: 'NGN'
  },
  balance: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Additional metadata
  issuer: String,
  brand: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Card', CardSchema);