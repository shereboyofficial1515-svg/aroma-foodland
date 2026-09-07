const express = require('express');
const router = express.Router();

const { hotel } = require('../controllers/bookingsController');
const { validate } = require('../utils/validate');
const { protect, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { hotelBookingSchema, bookingStatusSchema } = require('../utils/schemas/bookingSchemas');

router.post('/hotel', optionalAuth, validate(hotelBookingSchema), hotel.create);
router.get('/hotel', protect, hotel.list);
router.get('/hotel/:id', protect, hotel.getById);
router.patch('/hotel/:id/status', protect, requireRole('staff'), validate(bookingStatusSchema), hotel.updateStatus);

module.exports = router;
