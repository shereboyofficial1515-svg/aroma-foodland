const { supabaseAdmin } = require('../config/supabase');
const { AppError, asyncHandler } = require('../utils/AppError');
const { slugify } = require('../utils/schemas/catalogSchemas');
const { recordAudit } = require('../services/auditService');

const list = asyncHandler(async (req, res) => {
  const includeInactive = req.user && ['staff', 'manager', 'admin', 'super_admin'].includes(req.user.profile.role);

  let query = supabaseAdmin.from('meal_categories').select('*').order('display_order', { ascending: true });
  if (!includeInactive) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) {
    console.error('[categoriesController] database error:', error);
    throw new AppError('Could not load categories.', 500, 'FETCH_FAILED');
  }
  res.json({ success: true, categories: data });
});

const create = asyncHandler(async (req, res) => {
  const payload = req.body;
  const slug = slugify(payload.name);

  const { data, error } = await supabaseAdmin
    .from('meal_categories')
    .insert({ ...payload, slug })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new AppError('A category with this name already exists.', 409, 'DUPLICATE_CATEGORY');
    throw new AppError('Could not create category.', 500, 'CREATE_FAILED');
  }

  await recordAudit({ userId: req.user.id, action: 'category_created', resourceType: 'meal_category', resourceId: data.id, metadata: { name: data.name }, ip: req.ip });
  res.status(201).json({ success: true, category: data });
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const payload = { ...req.body };
  if (payload.name) payload.slug = slugify(payload.name);

  const { data, error } = await supabaseAdmin.from('meal_categories').update(payload).eq('id', id).select().single();
  if (error || !data) throw new AppError('Category not found.', 404, 'NOT_FOUND');

  await recordAudit({ userId: req.user.id, action: 'category_updated', resourceType: 'meal_category', resourceId: id, metadata: payload, ip: req.ip });
  res.json({ success: true, category: data });
});

const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { count } = await supabaseAdmin.from('meals').select('id', { count: 'exact', head: true }).eq('category_id', id);
  if (count && count > 0) {
    throw new AppError('This category still has meals assigned to it. Reassign or delete those meals first.', 409, 'CATEGORY_IN_USE');
  }

  const { error } = await supabaseAdmin.from('meal_categories').delete().eq('id', id);
  if (error) {
    console.error('[categoriesController] database error:', error);
    throw new AppError('Could not delete category.', 500, 'DELETE_FAILED');
  }

  await recordAudit({ userId: req.user.id, action: 'category_deleted', resourceType: 'meal_category', resourceId: id, ip: req.ip });
  res.json({ success: true, message: 'Category deleted.' });
});

module.exports = { list, create, update, remove };
