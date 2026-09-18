const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/authController');
const { validate } = require('../utils/validate');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');
const {
  registerSchema,
  loginSchema,
  sessionSyncSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} = require('../utils/schemas/authSchemas');

router.post('/register', authLimiter, validate(registerSchema), ctrl.register);
router.post('/login', authLimiter, validate(loginSchema), ctrl.login);
router.post('/logout', protect, ctrl.logout);
router.post('/refresh', ctrl.refresh);

router.get('/google', ctrl.googleAuthUrl);
router.post('/session', authLimiter, validate(sessionSyncSchema), ctrl.syncSession);

router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), ctrl.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), ctrl.resetPassword);
router.post('/resend-verification', authLimiter, validate(forgotPasswordSchema), ctrl.resendVerification);
router.post('/change-password', protect, validate(changePasswordSchema), ctrl.changePassword);

router.get('/me', protect, ctrl.getMe);

module.exports = router;