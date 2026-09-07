const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/cartController');
const { validate } = require('../utils/validate');
const { protect } = require('../middleware/auth');
const { addCartItemSchema, updateCartItemSchema } = require('../utils/schemas/orderSchemas');

router.use(protect); // the cart always belongs to a logged-in user

router.get('/', ctrl.getCart);
router.post('/', validate(addCartItemSchema), ctrl.addItem);
router.patch('/:itemId', validate(updateCartItemSchema), ctrl.updateItem);
router.delete('/:itemId', ctrl.removeItem);
router.delete('/', ctrl.clearCart);

module.exports = router;
