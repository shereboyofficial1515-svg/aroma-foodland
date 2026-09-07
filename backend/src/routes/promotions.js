const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/promotionsController');
const { validate } = require('../utils/validate');
const { protect, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { promotionSchema } = require('../utils/schemas/adminSchemas');

router.get('/', optionalAuth, ctrl.list);
router.post('/', protect, requireRole('staff'), validate(promotionSchema), ctrl.create);
router.patch('/:id', protect, requireRole('staff'), validate(promotionSchema.partial()), ctrl.update);
router.delete('/:id', protect, requireRole('manager'), ctrl.remove);

module.exports = router;
