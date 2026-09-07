const { z } = require('zod');

const gallerySchema = z.object({
  category: z.enum(['interior', 'exterior', 'food', 'events', 'hotel', 'general']).optional(),
  caption: z.string().trim().max(200).optional().nullable(),
  is_featured: z.coerce.boolean().optional(),
  display_order: z.coerce.number().int().min(0).optional(),
});

module.exports = { gallerySchema };
