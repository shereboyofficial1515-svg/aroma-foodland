const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/paymentsController');
const { protect } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/security');

router.post('/initialize', protect, paymentLimiter, ctrl.initialize);
router.get('/verify/:reference', protect, ctrl.verify);

// NOTE: POST /webhook is intentionally NOT defined here — it's mounted
// directly in app.js ahead of express.json() so it can receive the raw
// request body required for Paystack's HMAC signature verification.

module.exports = router;
