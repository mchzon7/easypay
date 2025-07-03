const mongoose = require('mongoose');
const User = require('./User');

const TransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Transaction must belong to a user']
  },
  amount: {
    type: Number,
    required: [true, 'Please add an amount'],
    min: [0, 'Amount cannot be negative']
  },
  type: {
    type: String,
    enum: {
      values: ['deposit', 'withdrawal', 'transfer', 'conversion', 'card_funding', 'payment'],
      message: 'Transaction type is either: deposit, withdrawal, transfer, conversion, card_funding, payment'
    },
    required: [true, 'Please add a transaction type']
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'reversed'],
    default: 'pending'
  },
  currency: {
    type: String,
    default: 'NGN',
    uppercase: true,
    enum: ['NGN', 'USD', 'EUR', 'GBP']
  },
  reference: {
    type: String,
    required: [true, 'Transaction must have a reference'],
    unique: true
  },
  description: {
    type: String,
    trim: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  sender: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  recipient: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  card: {
    type: mongoose.Schema.ObjectId,
    ref: 'Card'
  },
  bankDetails: {
    bankName: String,
    bankCode: String,
    accountNumber: String,
    accountName: String
  },
  fee: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number
  },
  conversionDetails: {
    fromCurrency: String,
    toCurrency: String,
    rate: Number,
    originalAmount: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Calculate net amount before saving
TransactionSchema.pre('save', function(next) {
  this.netAmount = this.amount - this.fee;
  this.updatedAt = Date.now();
  next();
});

// Populate user data when querying transactions
TransactionSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'firstName lastName email'
  }).populate({
    path: 'sender',
    select: 'firstName lastName email'
  }).populate({
    path: 'recipient',
    select: 'firstName lastName email'
  }).populate({
    path: 'card',
    select: 'cardNumber cardType'
  });
  
  next();
});

// Static method to get total balance for a user
TransactionSchema.statics.getBalance = async function(userId) {
  const obj = await this.aggregate([
    {
      $match: { user: userId, status: 'completed' }
    },
    {
      $group: {
        _id: null,
        balance: { $sum: '$netAmount' }
      }
    }
  ]);

  return obj.length > 0 ? obj[0].balance : 0;
};

// Static method to get transaction summary by type
TransactionSchema.statics.getSummary = async function(userId) {
  return this.aggregate([
    {
      $match: { user: userId }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    },
    {
      $project: {
        type: '$_id',
        count: 1,
        totalAmount: 1,
        _id: 0
      }
    }
  ]);
};

// Virtual for formatted date
TransactionSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Virtual for display amount with currency
TransactionSchema.virtual('displayAmount').get(function() {
  return `${this.currency} ${this.amount.toFixed(2)}`;
});

// Indexes for better query performance
TransactionSchema.index({ user: 1 });
TransactionSchema.index({ reference: 1 });
TransactionSchema.index({ createdAt: -1 });
TransactionSchema.index({ type: 1 });
TransactionSchema.index({ status: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);