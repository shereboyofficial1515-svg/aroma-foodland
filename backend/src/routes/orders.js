const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/ordersController');
const { validate } = require('../utils/validate');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { checkoutSchema, orderStatusSchema, orderQuerySchema } = require('../utils/schemas/orderSchemas');

router.use(protect);

router.post('/', validate(checkoutSchema), ctrl.checkout);
router.get('/', validate(orderQuerySchema, 'query'), ctrl.list);
router.get('/:id', ctrl.getById);
router.patch('/:id/status', requireRole('staff'), validate(orderStatusSchema), ctrl.updateStatus);

module.exports = router;
