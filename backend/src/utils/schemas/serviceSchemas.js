const { z } = require('zod');

const slugify = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const serviceSchema = z.object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(1000).optional().nullable(),
    price: z.coerce.number().min(0).optional().nullable(),
    is_active: z.coerce.boolean().optional(),
    display_order: z.coerce.number().int().min(0).optional(),
});

module.exports = { serviceSchema, slugify };