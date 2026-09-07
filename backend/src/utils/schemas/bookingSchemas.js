const { z } = require('zod');

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use date format YYYY-MM-DD');

const cateringBookingSchema = z.object({
  event_type: z.enum(['wedding', 'birthday', 'meeting', 'corporate', 'private_party', 'outdoor_catering', 'indoor_catering', 'other']),
  event_date: dateStr,
  guests: z.coerce.number().int().min(1).max(2000),
  location: z.string().trim().min(3).max(300),
  budget: z.coerce.number().min(0).optional().nullable(),
  services_required: z.union([z.array(z.string()), z.string()]).optional(),
  additional_info: z.string().trim().max(1000).optional().nullable(),
  customer_name: z.string().trim().min(2).max(120),
  customer_phone: z.string().trim().min(7).max(20),
  customer_email: z.string().trim().email(),
});

const hotelBookingSchema = z.object({
  check_in: dateStr,
  check_out: dateStr,
  guests: z.coerce.number().int().min(1).max(20),
  room_type: z.string().trim().max(80).optional().nullable(),
  customer_name: z.string().trim().min(2).max(120),
  customer_phone: z.string().trim().min(7).max(20),
  customer_email: z.string().trim().email(),
  additional_info: z.string().trim().max(1000).optional().nullable(),
}).refine((d) => new Date(d.check_out) > new Date(d.check_in), {
  message: 'Check-out must be after check-in.',
  path: ['check_out'],
});

const bookingStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'completed', 'cancelled']),
  admin_notes: z.string().trim().max(1000).optional().nullable(),
});

module.exports = { cateringBookingSchema, hotelBookingSchema, bookingStatusSchema };
