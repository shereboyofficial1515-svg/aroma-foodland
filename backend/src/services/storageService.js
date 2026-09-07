const { v4: uuidv4 } = require('uuid');
const { supabaseAdmin } = require('../config/supabase');
const { AppError } = require('../utils/AppError');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

// Buckets are created once in Supabase Storage (see README setup steps):
// meal-images, gallery, avatars, review-images, promo-images
async function uploadImage(bucket, file, folder = '') {
  if (!file) throw new AppError('No file uploaded.', 400, 'NO_FILE');
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw new AppError('Only JPG, PNG, WEBP or GIF images are allowed.', 400, 'INVALID_FILE_TYPE');
  }
  if (file.size > MAX_BYTES) {
    throw new AppError('Image must be smaller than 5MB.', 400, 'FILE_TOO_LARGE');
  }

  const ext = file.originalname.split('.').pop().toLowerCase();
  const path = `${folder ? `${folder}/` : ''}${uuidv4()}.${ext}`;

  const { error } = await supabaseAdmin.storage.from(bucket).upload(path, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });

  if (error) {
    throw new AppError('Image upload failed. Please try again.', 500, 'UPLOAD_FAILED');
  }

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

async function deleteImage(bucket, path) {
  if (!path) return;
  await supabaseAdmin.storage.from(bucket).remove([path]).catch(() => {});
}

module.exports = { uploadImage, deleteImage };
