const Card = require('../models/Card');
const User = require('../models/User');
const paystackService = require('../services/paystackservice');
const paystack = require('../config/paystack');
const axios = require('axios');

// @desc    Create virtual card
// @route   POST /cards
exports.getCreateCardPage = async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id).select('balance currency');
    
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/users/dashboard');
    }

    res.render('cards/create', {
      user: {
        _id: user._id,
        balance: user.balance || 0,
        currency: user.currency || 'NGN'
      }
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load card creation page');
    res.redirect('/cards');
  }
};

exports.createCard = async (req, res) => {
  try {
    const { currency, initialAmount } = req.body;
    const user = await User.findById(req.session.user._id);
    
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/cards/create');
    }

    // Create virtual card via Paystack
    const paystackCard = await paystackService.createVirtualCard(
      user.email,
      currency || 'NGN'
    );

    // Fund the card if initial amount specified
    if (initialAmount > 0) {
      await paystackService.fundVirtualCard(
        paystackCard.id,
        parseFloat(initialAmount)
      );
      
      // Deduct from user balance
      user.balance -= parseFloat(initialAmount);
      await user.save();
    }

    // Save card to database
    const card = await Card.create({
      user: user._id,
      cardId: paystackCard.id,
      cardPan: paystackCard.account_number,
      maskedPan: paystackCard.account_number.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '**  ** $4'),
      cvv: paystackCard.cvv || '000', // Paystack may not provide CVV
      expiryMonth: paystackCard.expiration.split('/')[0],
      expiryYear: paystackCard.expiration.split('/')[1],
      cardType: paystackCard.brand.toLowerCase(),
      currency: currency || 'NGN',
      balance: initialAmount || 0,
      issuer: paystackCard.bank,
      brand: paystackCard.brand
    });

    // Record transaction
    if (initialAmount > 0) {
      await Transaction.create({
        user: user._id,
        amount: initialAmount,
        type: 'card_funding',
        status: 'completed',
        reference: `CARD-${paystackCard.id}`,
        metadata: {
          cardId: card._id,
          action: 'initial_funding'
        }
      });
    }

    req.flash('success', 'Virtual card created successfully');
    res.redirect('/cards');
  } catch (err) {
    console.error('Card creation error:', err);
    req.flash('error', err.message || 'Failed to create virtual card');
    res.redirect('/cards/create');
  }
};

// Get all cards for user
exports.getCards = async (req, res) => {
  try {
    const cards = await Card.find({ user: req.session.user._id });
    const user = await User.findById(req.session.user._id).select('balance currency');
    
    res.render('cards/list', {
      cards,
      user: {
        balance: user.balance || 0,
        currency: user.currency || 'NGN'
      }
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load cards');
    res.redirect('/users/dashboard');
  }
};

// Get single card details
exports.getCard = async (req, res) => {
  try {
    const card = await Card.findOne({  
      _id: req.params.id,
      user: req.session.user._id 
    });
    
    if (!card) {
      req.flash('error', 'Card not found');
      return res.redirect('/cards');
    }

    res.render('cards/details', {
      card,
      user: {
        currency: req.session.user.currency || 'NGN'
      }
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load card details');
    res.redirect('/cards');
  }
};

// @desc    Fund virtual card
// @route   POST /cards/:id/fund


// @desc    Block/Unblock card
// @route   PUT /cards/:id/status
// Toggle card active status
exports.toggleCardStatus = async (req, res) => {
  try {
    const card = await Card.findOne({
      _id: req.params.id,
      user: req.session.user._id
    });

    if (!card) {
      req.flash('error', 'Card not found');
      return res.redirect('/cards');
    }

    card.isActive = !card.isActive;
    await card.save();

    req.flash('success', `Card ${card.isActive ? 'activated' : 'deactivated'} successfully`);
    res.redirect(req.headers.referer || '/cards');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update card status');
    res.redirect('/cards');
  }
};

// Delete a card
exports.deleteCard = async (req, res) => {
  try {
    const card = await Card.findOneAndDelete({
      _id: req.params.id,
      user: req.session.user._id
    });

    if (!card) {
      req.flash('error', 'Card not found');
      return res.redirect('/cards');
    }

    // Refund card balance to user account if card had balance
    if (card.balance > 0) {
      const user = await User.findById(req.user.id);
      user.balance += card.balance;
      await user.save();
    }

    req.flash('success', 'Card deleted successfully');
    res.redirect('/cards');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to delete card');
    res.redirect('/cards');
  }
};