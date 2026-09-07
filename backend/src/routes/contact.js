const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/contactController');
const { validate } = require('../utils/validate');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { authLimiter } = require('../middleware/security');
const { contactSchema } = require('../utils/schemas/contactSchemas');

router.post('/', authLimiter, validate(contactSchema), ctrl.submit);
router.get('/', protect, requireRole('staff'), ctrl.list);
router.patch('/:id/read', protect, requireRole('staff'), ctrl.markRead);

module.exports = router;
