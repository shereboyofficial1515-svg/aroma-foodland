const multer = require('multer');

// Memory storage: files are held as a Buffer and handed straight to
// storageService.uploadImage, never written to local disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
});

module.exports = { upload };
