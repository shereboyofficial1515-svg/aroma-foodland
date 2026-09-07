const { z } = require('zod');

const createReviewSchema = z.object({
  order_id: z.string().uuid('Invalid order.'),
  meal_id: z.string().uuid().optional().nullable(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().nullable(),
});

const moderateReviewSchema = z.object({
  is_approved: z.coerce.boolean().optional(),
  is_hidden: z.coerce.boolean().optional(),
  is_featured: z.coerce.boolean().optional(),
});

const reviewQuerySchema = z.object({
  meal_id: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

module.exports = { createReviewSchema, moderateReviewSchema, reviewQuerySchema };
