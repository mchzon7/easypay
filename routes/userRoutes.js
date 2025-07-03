const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { checkAuthenticated } = require('../middleware/authMiddleware');

// User Dashboard and Profile Routes
router.get('/dashboard', userController.getDashboard);
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

// Bank Account Routes
router.post('/bank-accounts', userController.addBankAccount);
router.put('/bank-accounts/default/:accountId', userController.setDefaultBankAccount);
router.delete('/bank-accounts/:accountId', userController.deleteBankAccount);

module.exports = router;