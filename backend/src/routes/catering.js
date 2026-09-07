const express = require('express');
const router = express.Router();

const { catering } = require('../controllers/bookingsController');
const { validate } = require('../utils/validate');
const { protect, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { cateringBookingSchema, bookingStatusSchema } = require('../utils/schemas/bookingSchemas');

router.post('/', optionalAuth, validate(cateringBookingSchema), catering.create);
router.get('/', protect, catering.list);
router.get('/:id', protect, catering.getById);
router.patch('/:id/status', protect, requireRole('staff'), validate(bookingStatusSchema), catering.updateStatus);

module.exports = router;
