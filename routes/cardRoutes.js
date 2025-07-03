const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');
const { body } = require('express-validator');
const { checkAuthenticated } = require('../middleware/authMiddleware');

// Card routes
router.get('/card/:id', cardController.getCard);
router.get('/', cardController.getCards);
router.get('/create',  cardController.getCreateCardPage);
router.post('/', [
    body('currency').isIn(['NGN', 'USD', 'EUR']),
    body('initialAmount').optional().isFloat({ min: 0 })
], cardController.createCard);
//router.post('/:id/fund',  cardController.fundCard);
router.post('/card/:id/status',  cardController.toggleCardStatus);
router.delete('/card/:id',  cardController.deleteCard);

module.exports = router;