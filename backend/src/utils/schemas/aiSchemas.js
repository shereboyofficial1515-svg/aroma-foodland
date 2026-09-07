const { z } = require('zod');

const chatSchema = z.object({
  session_id: z.string().trim().min(8).max(100),
  message: z.string().trim().min(1).max(1000),
});

const aiSettingsSchema = z.object({
  ai_enabled: z.coerce.boolean().optional(),
  ai_system_prompt: z.string().trim().max(4000).optional(),
  ai_welcome_message: z.string().trim().max(300).optional(),
});

module.exports = { chatSchema, aiSettingsSchema };
