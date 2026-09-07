const { z } = require('zod');

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use date format YYYY-MM-DD');
const timeStr = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Use time format HH:MM');

const createReservationSchema = z.object({
  reservation_date: dateStr,
  reservation_time: timeStr,
  guests: z.coerce.number().int().min(1).max(50),
  customer_name: z.string().trim().min(2).max(120),
  customer_phone: z.string().trim().min(7).max(20),
  customer_email: z.string().trim().email(),
  special_request: z.string().trim().max(500).optional().nullable(),
}).refine((data) => new Date(`${data.reservation_date}T${data.reservation_time}`) > new Date(), {
  message: 'Please choose a future date and time.',
  path: ['reservation_date'],
});

const updateReservationStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show']),
});

const rescheduleReservationSchema = z.object({
  reservation_date: dateStr,
  reservation_time: timeStr,
});

const availabilityQuerySchema = z.object({
  date: dateStr,
});

const slotSchema = z.object({
  slot_time: timeStr,
  max_capacity: z.coerce.number().int().min(1).max(200),
  is_active: z.coerce.boolean().optional(),
});

module.exports = {
  createReservationSchema,
  updateReservationStatusSchema,
  rescheduleReservationSchema,
  availabilityQuerySchema,
  slotSchema,
};
