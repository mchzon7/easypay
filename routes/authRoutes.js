const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { checkAuthenticated, checkNotAuthenticated } = require('../middleware/authMiddleware');

// Auth Routes
router.get('/login',  (req, res) => res.render('auth/login', {error: 'Invalid credentials', formData: req.body}));
router.get('/register', (req, res) => res.render('auth/register', {error: 'Invalid credentials', formData: req.body}));
router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/logout', authController.logout);

module.exports = router;