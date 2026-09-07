const { z } = require('zod');

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[0-9]/, 'Password must include a number');

const phone = z
  .string()
  .trim()
  .regex(/^(\+?234|0)[789][01]\d{8}$/, 'Enter a valid Nigerian phone number');

const registerSchema = z.object({
  full_name: z.string().trim().min(2, 'Full name is required').max(120),
  email: z.string().trim().email('Enter a valid email address').toLowerCase(),
  phone,
  password,
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

const sessionSyncSchema = z.object({
  access_token: z.string().min(10),
  refresh_token: z.string().min(10),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email address').toLowerCase(),
});

const resetPasswordSchema = z.object({
  access_token: z.string().min(10),
  new_password: password,
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: password,
});

const refreshSchema = z.object({
  refresh_token: z.string().min(10).optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  sessionSyncSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  refreshSchema,
};
