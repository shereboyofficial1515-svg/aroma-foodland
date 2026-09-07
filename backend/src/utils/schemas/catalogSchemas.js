const { z } = require('zod');

const slugify = (s) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().nullable(),
  display_order: z.coerce.number().int().min(0).optional(),
  is_active: z.coerce.boolean().optional(),
});

const mealSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  price: z.coerce.number().min(0),
  discount_price: z.coerce.number().min(0).optional().nullable(),
  availability: z.coerce.boolean().optional(),
  stock: z.coerce.number().int().min(0).optional().nullable(),
  preparation_time_minutes: z.coerce.number().int().min(0).optional(),
  ingredients: z.union([z.array(z.string()), z.string()]).optional(),
  allergens: z.union([z.array(z.string()), z.string()]).optional(),
  spice_level: z.coerce.number().int().min(0).max(3).optional(),
  is_featured: z.coerce.boolean().optional(),
  is_popular: z.coerce.boolean().optional(),
});

const mealQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  category: z.string().optional(), // slug
  availability: z.enum(['true', 'false']).optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  featured: z.enum(['true', 'false']).optional(),
  popular: z.enum(['true', 'false']).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'popular', 'rating', 'newest']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

module.exports = { categorySchema, mealSchema, mealQuerySchema, slugify };
