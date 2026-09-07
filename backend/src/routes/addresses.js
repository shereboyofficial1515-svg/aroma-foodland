const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/addressesController');
const { validate } = require('../utils/validate');
const { protect } = require('../middleware/auth');
const { addressSchema } = require('../utils/schemas/adminSchemas');

router.use(protect);

router.get('/', ctrl.list);
router.post('/', validate(addressSchema), ctrl.create);
router.patch('/:id', validate(addressSchema.partial()), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
