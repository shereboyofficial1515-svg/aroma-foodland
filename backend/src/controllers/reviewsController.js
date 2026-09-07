const { supabaseAdmin } = require('../config/supabase');
const { AppError, asyncHandler } = require('../utils/AppError');
const { uploadImage } = require('../services/storageService');
const { recordAudit } = require('../services/auditService');

const isStaff = (req) => req.user && ['staff', 'manager', 'admin', 'super_admin'].includes(req.user.profile.role);

// ---------------------------------------------------------------------------
// GET /api/v1/reviews — public, approved + not hidden only (unless staff)
// ---------------------------------------------------------------------------
const list = asyncHandler(async (req, res) => {
  const { meal_id, page = 1, limit = 20 } = req.query;

  let query = supabaseAdmin
    .from('reviews')
    .select('*, review_images(id, image_url), profiles(full_name, avatar_url)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (!isStaff(req)) query = query.eq('is_approved', true).eq('is_hidden', false);
  if (meal_id) query = query.eq('meal_id', meal_id);

  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new AppError('Could not load reviews.', 500, 'FETCH_FAILED');

  res.json({ success: true, reviews: data, pagination: { page: Number(page), limit: Number(limit), total: count || 0 } });
});

// ---------------------------------------------------------------------------
// POST /api/v1/reviews — only for the review author's own COMPLETED order,
// one review per order (also enforced by a unique constraint + RLS at the
// DB level from Phase 1 — this check gives a friendly error before that).
// ---------------------------------------------------------------------------
const create = asyncHandler(async (req, res) => {
  const { order_id, meal_id, rating, comment } = req.body;

  const { data: order } = await supabaseAdmin.from('orders').select('id, user_id, status').eq('id', order_id).single();
  if (!order) throw new AppError('Order not found.', 404, 'NOT_FOUND');
  if (order.user_id !== req.user.id) throw new AppError("You can only review your own orders.", 403, 'FORBIDDEN');
  if (order.status !== 'completed') throw new AppError('You can only review orders after they are completed.', 400, 'ORDER_NOT_COMPLETED');

  const { data: existing } = await supabaseAdmin.from('reviews').select('id').eq('user_id', req.user.id).eq('order_id', order_id).maybeSingle();
  if (existing) throw new AppError('You have already reviewed this order.', 409, 'ALREADY_REVIEWED');

  const { data: review, error } = await supabaseAdmin
    .from('reviews')
    .insert({ user_id: req.user.id, order_id, meal_id, rating, comment, is_approved: false })
    .select()
    .single();

  if (error) throw new AppError('Could not submit your review. Please try again.', 500, 'CREATE_FAILED');

  res.status(201).json({ success: true, review, message: 'Thanks for your review! It will appear once approved by our team.' });
});

// ---------------------------------------------------------------------------
// POST /api/v1/reviews/:id/images — owner only, before or shortly after moderation
// ---------------------------------------------------------------------------
const uploadImages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const files = req.files || [];
  if (!files.length) throw new AppError('No images uploaded.', 400, 'NO_FILE');

  const { data: review } = await supabaseAdmin.from('reviews').select('id, user_id').eq('id', id).single();
  if (!review) throw new AppError('Review not found.', 404, 'NOT_FOUND');
  if (review.user_id !== req.user.id) throw new AppError("You don't have permission to edit this review.", 403, 'FORBIDDEN');

  const rows = [];
  for (const file of files) {
    // eslint-disable-next-line no-await-in-loop
    const { url } = await uploadImage('review-images', file, id);
    rows.push({ review_id: id, image_url: url });
  }

  const { data: images, error } = await supabaseAdmin.from('review_images').insert(rows).select();
  if (error) throw new AppError('Images uploaded but could not be attached to the review.', 500, 'LINK_FAILED');

  res.status(201).json({ success: true, images });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/reviews/:id/moderate  (staff+) — approve / hide / feature
// ---------------------------------------------------------------------------
const moderate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin.from('reviews').update(req.body).eq('id', id).select().single();
  if (error || !data) throw new AppError('Review not found.', 404, 'NOT_FOUND');

  await recordAudit({ userId: req.user.id, action: 'review_moderated', resourceType: 'review', resourceId: id, metadata: req.body, ip: req.ip });
  res.json({ success: true, review: data });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/reviews/:id  (owner or staff)
// ---------------------------------------------------------------------------
const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data: review } = await supabaseAdmin.from('reviews').select('user_id').eq('id', id).single();
  if (!review) throw new AppError('Review not found.', 404, 'NOT_FOUND');
  if (review.user_id !== req.user.id && !isStaff(req)) throw new AppError("You don't have permission to delete this review.", 403, 'FORBIDDEN');

  const { error } = await supabaseAdmin.from('reviews').delete().eq('id', id);
  if (error) throw new AppError('Could not delete review.', 500, 'DELETE_FAILED');

  if (isStaff(req)) await recordAudit({ userId: req.user.id, action: 'review_deleted', resourceType: 'review', resourceId: id, ip: req.ip });
  res.json({ success: true, message: 'Review deleted.' });
});

module.exports = { list, create, uploadImages, moderate, remove };
