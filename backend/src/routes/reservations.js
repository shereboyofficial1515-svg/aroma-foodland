const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/reservationsController');
const { validate } = require('../utils/validate');
const { protect, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const {
  createReservationSchema,
  updateReservationStatusSchema,
  rescheduleReservationSchema,
  availabilityQuerySchema,
  slotSchema,
} = require('../utils/schemas/reservationSchemas');

router.get('/availability', validate(availabilityQuerySchema, 'query'), ctrl.availability);
router.post('/', optionalAuth, validate(createReservationSchema), ctrl.create);

router.get('/', protect, ctrl.list);
router.get('/:id', protect, ctrl.getById);
router.patch('/:id/status', protect, requireRole('staff'), validate(updateReservationStatusSchema), ctrl.updateStatus);
router.patch('/:id/reschedule', protect, validate(rescheduleReservationSchema), ctrl.reschedule);
router.delete('/:id', protect, ctrl.cancel);

router.get('/admin/slots', protect, requireRole('staff'), ctrl.listSlots);
router.put('/admin/slots', protect, requireRole('manager'), validate(slotSchema), ctrl.upsertSlot);
router.post('/admin/send-reminders', protect, requireRole('staff'), ctrl.sendReminders);

module.exports = router;
