const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/servicesController');
const { validate } = require('../utils/validate');
const { protect, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { upload } = require('../middleware/upload');
const { serviceSchema } = require('../utils/schemas/serviceSchemas');

router.get('/', optionalAuth, ctrl.list);
router.post('/', protect, requireRole('staff'), validate(serviceSchema), ctrl.create);
router.patch('/:id', protect, requireRole('staff'), validate(serviceSchema.partial()), ctrl.update);
router.delete('/:id', protect, requireRole('manager'), ctrl.remove);
router.post('/:id/image', protect, requireRole('staff'), upload.single('image'), ctrl.uploadServiceImage);

module.exports = router;