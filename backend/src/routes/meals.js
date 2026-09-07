const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/mealsController');
const { validate } = require('../utils/validate');
const { protect, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { upload } = require('../middleware/upload');
const { mealSchema, mealQuerySchema } = require('../utils/schemas/catalogSchemas');

router.get('/', optionalAuth, validate(mealQuerySchema, 'query'), ctrl.list);
router.get('/:slug', optionalAuth, ctrl.getBySlug);

router.post('/', protect, requireRole('staff'), validate(mealSchema), ctrl.create);
router.patch('/:id', protect, requireRole('staff'), validate(mealSchema.partial()), ctrl.update);
router.delete('/:id', protect, requireRole('manager'), ctrl.remove);

router.post('/:id/images', protect, requireRole('staff'), upload.array('images', 6), ctrl.uploadImages);
router.delete('/images/:imageId', protect, requireRole('staff'), ctrl.deleteMealImage);

module.exports = router;
