const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/settingsController');
const { validate } = require('../utils/validate');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { settingsUpdateSchema } = require('../utils/schemas/adminSchemas');

router.get('/public', ctrl.getPublic);
router.get('/', protect, requireRole('staff'), ctrl.getAll);
router.patch('/', protect, requireRole('admin'), validate(settingsUpdateSchema), ctrl.update);

module.exports = router;
