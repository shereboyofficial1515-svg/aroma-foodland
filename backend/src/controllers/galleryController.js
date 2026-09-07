const { supabaseAdmin } = require('../config/supabase');
const { AppError, asyncHandler } = require('../utils/AppError');
const { uploadImage, deleteImage } = require('../services/storageService');
const { recordAudit } = require('../services/auditService');

const list = asyncHandler(async (req, res) => {
  const { category, featured } = req.query;
  let query = supabaseAdmin.from('gallery').select('*').order('display_order', { ascending: true });
  if (category) query = query.eq('category', category);
  if (featured === 'true') query = query.eq('is_featured', true);

  const { data, error } = await query;
  if (error) throw new AppError('Could not load gallery.', 500, 'FETCH_FAILED');
  res.json({ success: true, images: data });
});

const upload_ = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (!files.length) throw new AppError('No images uploaded.', 400, 'NO_FILE');

  const { category = 'general', caption } = req.body;
  const rows = [];
  for (const file of files) {
    // eslint-disable-next-line no-await-in-loop
    const { url } = await uploadImage('gallery', file, category);
    rows.push({ image_url: url, category, caption: caption || null });
  }

  const { data, error } = await supabaseAdmin.from('gallery').insert(rows).select();
  if (error) throw new AppError('Could not save gallery images.', 500, 'CREATE_FAILED');

  await recordAudit({ userId: req.user.id, action: 'gallery_images_uploaded', resourceType: 'gallery', metadata: { count: rows.length, category }, ip: req.ip });
  res.status(201).json({ success: true, images: data });
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin.from('gallery').update(req.body).eq('id', id).select().single();
  if (error || !data) throw new AppError('Image not found.', 404, 'NOT_FOUND');
  res.json({ success: true, image: data });
});

const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data: image } = await supabaseAdmin.from('gallery').select('*').eq('id', id).single();
  if (!image) throw new AppError('Image not found.', 404, 'NOT_FOUND');

  await supabaseAdmin.from('gallery').delete().eq('id', id);
  const path = image.image_url.split('/gallery/')[1];
  if (path) await deleteImage('gallery', path);

  await recordAudit({ userId: req.user.id, action: 'gallery_image_deleted', resourceType: 'gallery', resourceId: id, ip: req.ip });
  res.json({ success: true, message: 'Image removed.' });
});

module.exports = { list, upload: upload_, update, remove };
