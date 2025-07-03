const Transaction = require('../models/Transaction');
const User = require('../models/User');

// @desc    Get all transactions for user
// @route   GET /transactions
exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id })
      .sort('-createdAt')
      .populate('recipient', 'firstName lastName email')
      .populate('sender', 'firstName lastName email');

    const user = await User.findById(req.user.id);

    res.render('transactions/history', {
      transactions,
      currency: user.currency
    });
  } catch (err) {
    console.error(err);
    res.render('error', { error: 'Failed to fetch transactions' });
  }
};

// @desc    Filter transactions by type
// @route   GET /transactions/filter
exports.filterTransactions = async (req, res) => {
  try {
    const { type } = req.query;
    let query = { user: req.user.id };

    if (type && type !== 'all') {
      query.type = type;
    }

    const transactions = await Transaction.find(query)
      .sort('-createdAt')
      .populate('recipient', 'firstName lastName email')
      .populate('sender', 'firstName lastName email');

    const user = await User.findById(req.user.id);

    res.render('transactions/history', {
      transactions,
      currency: user.currency,
      selectedType: type || 'all'
    });
  } catch (err) {
    console.error(err);
    res.render('error', { error: 'Failed to filter transactions' });
  }
};

// @desc    Get transaction details
// @route   GET /transactions/:id
exports.getTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('recipient', 'firstName lastName email')
      .populate('sender', 'firstName lastName email');

    if (!transaction) {
      return res.render('error', { error: 'Transaction not found' });
    }

    // Ensure user owns the transaction
    if (transaction.user.toString() !== req.user.id) {
      return res.render('error', { error: 'Not authorized' });
    }

    const user = await User.findById(req.user.id);

    res.render('transactions/details', {
      transaction,
      currency: user.currency
    });
  } catch (err) {
    console.error(err);
    res.render('error', { error: 'Failed to fetch transaction' });
  }
};