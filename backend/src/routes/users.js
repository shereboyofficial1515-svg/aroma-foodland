const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/usersController');
const { validate } = require('../utils/validate');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { roleUpdateSchema, userStatusSchema, profileUpdateSchema } = require('../utils/schemas/adminSchemas');

router.use(protect);

router.patch('/me', validate(profileUpdateSchema), ctrl.updateMe);
router.get('/', requireRole('staff'), ctrl.list);
router.get('/:id', ctrl.getById);
router.get('/:id/orders', ctrl.getOrders);
router.get('/:id/reservations', ctrl.getReservations);
router.patch('/:id/role', requireRole('admin'), validate(roleUpdateSchema), ctrl.updateRole);
router.patch('/:id/status', requireRole('staff'), validate(userStatusSchema), ctrl.updateStatus);

module.exports = router;
