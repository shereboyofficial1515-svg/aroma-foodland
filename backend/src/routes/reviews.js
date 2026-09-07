const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/reviewsController');
const { validate } = require('../utils/validate');
const { protect, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { upload } = require('../middleware/upload');
const { createReviewSchema, moderateReviewSchema, reviewQuerySchema } = require('../utils/schemas/reviewSchemas');

router.get('/', optionalAuth, validate(reviewQuerySchema, 'query'), ctrl.list);
router.post('/', protect, validate(createReviewSchema), ctrl.create);
router.post('/:id/images', protect, upload.array('images', 4), ctrl.uploadImages);
router.patch('/:id/moderate', protect, requireRole('staff'), validate(moderateReviewSchema), ctrl.moderate);
router.delete('/:id', protect, ctrl.remove);

module.exports = router;
