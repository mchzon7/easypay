const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { checkAuthenticated } = require('../middleware/authMiddleware');

// Transaction History Routes
router.get('/', checkAuthenticated, transactionController.getTransactions);
router.get('/filter', checkAuthenticated, transactionController.filterTransactions);
router.get('/:id', checkAuthenticated, transactionController.getTransaction);

module.exports = router;