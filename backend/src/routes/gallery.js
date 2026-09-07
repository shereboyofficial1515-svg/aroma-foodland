const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/galleryController');
const { validate } = require('../utils/validate');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { upload } = require('../middleware/upload');
const { gallerySchema } = require('../utils/schemas/gallerySchemas');

router.get('/', ctrl.list);
router.post('/', protect, requireRole('staff'), upload.array('images', 10), ctrl.upload);
router.patch('/:id', protect, requireRole('staff'), validate(gallerySchema), ctrl.update);
router.delete('/:id', protect, requireRole('staff'), ctrl.remove);

module.exports = router;
