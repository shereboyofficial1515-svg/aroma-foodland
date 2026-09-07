const { z } = require('zod');

const settingsUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(7).max(20).optional(),
  email: z.string().trim().email().optional().nullable(),
  address: z.string().trim().min(5).max(300).optional(),
  opening_hours: z.record(z.string()).optional(),
  delivery_fee: z.coerce.number().min(0).optional(),
  minimum_order: z.coerce.number().min(0).optional(),
  reservation_capacity_per_slot: z.coerce.number().int().min(1).optional(),
  currency: z.string().trim().length(3).optional(),
  tax_percent: z.coerce.number().min(0).max(100).optional(),
});

const roleUpdateSchema = z.object({
  role: z.enum(['customer', 'staff', 'manager', 'admin', 'super_admin']),
});

const profileUpdateSchema = z.object({
  full_name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(7).max(20).optional(),
  avatar_url: z.string().trim().url().optional().nullable(),
  notification_prefs: z.object({
    email: z.coerce.boolean().optional(),
    push: z.coerce.boolean().optional(),
    promotions: z.coerce.boolean().optional(),
  }).partial().optional(),
});

const addressSchema = z.object({
  label: z.string().trim().max(40).optional(),
  street: z.string().trim().min(3).max(200),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80).optional(),
  landmark: z.string().trim().max(200).optional().nullable(),
  is_default: z.coerce.boolean().optional(),
});

const userStatusSchema = z.object({
  is_active: z.coerce.boolean(),
});

const promotionSchema = z.object({
  title: z.string().trim().min(2).max(150),
  message: z.string().trim().min(2).max(1000),
  target_audience: z.enum(['all', 'customers', 'staff']).default('all'),
  starts_at: z.string().optional(),
  ends_at: z.string().optional().nullable(),
  is_active: z.coerce.boolean().optional(),
  broadcast: z.coerce.boolean().optional(),
});

module.exports = { settingsUpdateSchema, roleUpdateSchema, userStatusSchema, promotionSchema, profileUpdateSchema, addressSchema };
