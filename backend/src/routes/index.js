const express = require('express');
const router = express.Router();

// ---------------------------------------------------------------------------
// Each feature area gets its own router file, mounted here as it's built.
// This is the single place that wires the whole API together, so app.js
// never needs to change as new routers are added (except the Paystack
// webhook, which needs a raw body parser — see app.js).
// ---------------------------------------------------------------------------

router.use('/auth', require('./auth'));
router.use('/meals', require('./meals'));
router.use('/categories', require('./categories'));
router.use('/cart', require('./cart'));
router.use('/orders', require('./orders'));
router.use('/payments', require('./payments'));
router.use('/reservations', require('./reservations'));
router.use('/catering', require('./catering'));
router.use('/bookings', require('./bookings'));
router.use('/contact', require('./contact'));
router.use('/reviews', require('./reviews'));
router.use('/notifications', require('./notifications'));
router.use('/gallery', require('./gallery'));
router.use('/search', require('./search'));
router.use('/ai', require('./ai'));
router.use('/users', require('./users'));
router.use('/settings', require('./settings'));
router.use('/promotions', require('./promotions'));
router.use('/admin', require('./admin'));
router.use('/addresses', require('./addresses'));

router.get('/', (req, res) => {
  res.json({ success: true, message: 'Aroma FoodLand API v1' });
});

module.exports = router;
