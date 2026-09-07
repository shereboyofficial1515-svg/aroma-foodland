const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/aiController');
const { validate } = require('../utils/validate');
const { protect, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { aiChatLimiter } = require('../middleware/security');
const { chatSchema, aiSettingsSchema } = require('../utils/schemas/aiSchemas');

router.get('/welcome', ctrl.welcome);
router.post('/chat', optionalAuth, aiChatLimiter, validate(chatSchema), ctrl.chat);

router.get('/settings', protect, requireRole('staff'), ctrl.getSettings);
router.patch('/settings', protect, requireRole('admin'), validate(aiSettingsSchema), ctrl.updateSettings);

router.get('/conversations', protect, requireRole('staff'), ctrl.listConversations);
router.get('/conversations/:id', protect, requireRole('staff'), ctrl.getConversation);

module.exports = router;
