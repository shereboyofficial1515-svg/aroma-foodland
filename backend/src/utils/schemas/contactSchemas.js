const { z } = require('zod');

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().max(20).optional().nullable(),
  subject: z.string().trim().max(150).optional().nullable(),
  message: z.string().trim().min(5).max(2000),
});

module.exports = { contactSchema };
