const { z } = require('zod');

const addCartItemSchema = z.object({
  meal_id: z.string().uuid('Invalid meal.'),
  quantity: z.coerce.number().int().min(1).max(50).default(1),
  special_instructions: z.string().trim().max(300).optional().nullable(),
});

const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(50).optional(),
  special_instructions: z.string().trim().max(300).optional().nullable(),
});

const checkoutSchema = z.object({
  order_type: z.enum(['dine_in', 'pickup', 'delivery']),
  customer_name: z.string().trim().min(2).max(120),
  customer_phone: z.string().trim().min(7).max(20),
  customer_email: z.string().trim().email(),
  address_id: z.string().uuid().optional().nullable(),
  delivery_address_text: z.string().trim().max(300).optional().nullable(),
  special_instructions: z.string().trim().max(500).optional().nullable(),
  idempotency_key: z.string().trim().min(8).max(100),
}).refine((data) => data.order_type !== 'delivery' || data.address_id || data.delivery_address_text, {
  message: 'A delivery address is required for delivery orders.',
  path: ['delivery_address_text'],
});

const orderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled', 'refunded']),
});

const orderQuerySchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

module.exports = { addCartItemSchema, updateCartItemSchema, checkoutSchema, orderStatusSchema, orderQuerySchema };
