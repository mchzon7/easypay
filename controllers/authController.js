const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// @desc    Register user
// @route   POST /auth/register
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('auth/register', { 
        error: 'User already exists',
        formData: req.body
      });
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password
    });

    res.redirect('/users/dashboard');
  } catch (err) {
    console.error(err);
    res.render('auth/register', { 
      error: 'Registration failed',
      formData: req.body
    });
  }
};

// @desc    Login user
// @route   POST /auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.render('auth/login', { 
        error: 'Please provide email and password',
        formData: req.body
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.render('auth/login', { 
        error: 'Invalid credentials',
        formData: req.body
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.render('auth/login', { 
        error: 'Invalid credentials',
        formData: req.body
      });
    }

    req.session.user = user;
    res.redirect('/users/dashboard');
  } catch (err) {
    console.error(err);
    res.render('auth/login', { 
      error: 'Login failed',
      formData: req.body
    });
  }
};

// @desc    Logout user
// @route   GET /auth/logout
exports.logout = (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.redirect('/');
};

// @desc    Get current logged in user
// @route   GET /auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};