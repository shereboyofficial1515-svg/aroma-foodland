const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

router.use(protect);

router.get('/dashboard', requireRole('staff'), ctrl.dashboard);
router.get('/audit-logs', requireRole('admin'), ctrl.auditLogs);

module.exports = router;
