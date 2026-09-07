const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/categoriesController');
const { validate } = require('../utils/validate');
const { protect, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { categorySchema } = require('../utils/schemas/catalogSchemas');

router.get('/', optionalAuth, ctrl.list);
router.post('/', protect, requireRole('staff'), validate(categorySchema), ctrl.create);
router.patch('/:id', protect, requireRole('staff'), validate(categorySchema.partial()), ctrl.update);
router.delete('/:id', protect, requireRole('manager'), ctrl.remove);

module.exports = router;
