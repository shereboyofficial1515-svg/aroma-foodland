const { supabaseAdmin } = require('../config/supabase');
const { AppError, asyncHandler } = require('../utils/AppError');
const { slugify } = require('../utils/schemas/catalogSchemas');
const { recordAudit } = require('../services/auditService');
const { uploadImage, deleteImage } = require('../services/storageService');

const isStaff = (req) => req.user && ['staff', 'manager', 'admin', 'super_admin'].includes(req.user.profile.role);

// Normalizes ingredients/allergens which may arrive as a comma-separated
// string (from a multipart form) or a real array (from JSON).
function toArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.length) return value.split(',').map((s) => s.trim()).filter(Boolean);
  return undefined;
}

// ---------------------------------------------------------------------------
// GET /api/v1/meals  — public browse with search/filter/sort/pagination
// ---------------------------------------------------------------------------
const list = asyncHandler(async (req, res) => {
  const { search, category, availability, min_price, max_price, featured, popular, sort, page = 1, limit = 20 } = req.query;

  let query = supabaseAdmin
    .from('meals')
    .select('*, meal_categories(name, slug)', { count: 'exact' });

  // Customers only ever see available meals unless they're staff and
  // explicitly pass availability=false to review disabled items.
  if (!isStaff(req)) {
    query = query.eq('availability', true);
  } else if (availability !== undefined) {
    query = query.eq('availability', availability === 'true');
  }

  if (search) query = query.textSearch('name', search, { type: 'websearch' }).ilike('name', `%${search}%`);
  if (category) {
    const { data: cat } = await supabaseAdmin.from('meal_categories').select('id').eq('slug', category).single();
    if (cat) query = query.eq('category_id', cat.id);
    else return res.json({ success: true, meals: [], pagination: { page: 1, limit: Number(limit), total: 0, pages: 0 } });
  }
  if (min_price !== undefined) query = query.gte('price', min_price);
  if (max_price !== undefined) query = query.lte('price', max_price);
  if (featured !== undefined) query = query.eq('is_featured', featured === 'true');
  if (popular !== undefined) query = query.eq('is_popular', popular === 'true');

  const sortMap = {
    price_asc: { column: 'price', ascending: true },
    price_desc: { column: 'price', ascending: false },
    popular: { column: 'is_popular', ascending: false },
    rating: { column: 'rating_avg', ascending: false },
    newest: { column: 'created_at', ascending: false },
  };
  const sortOpt = sortMap[sort] || sortMap.newest;
  query = query.order(sortOpt.column, { ascending: sortOpt.ascending });

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw new AppError('Could not load meals.', 500, 'FETCH_FAILED');

  res.json({
    success: true,
    meals: data,
    pagination: { page: Number(page), limit: Number(limit), total: count || 0, pages: Math.ceil((count || 0) / limit) },
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/meals/:slug
// ---------------------------------------------------------------------------
const getBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  let query = supabaseAdmin.from('meals').select('*, meal_categories(name, slug), meal_images(id, image_url, display_order)').eq('slug', slug);
  if (!isStaff(req)) query = query.eq('availability', true);

  const { data: meal, error } = await query.single();
  if (error || !meal) throw new AppError('This meal could not be found.', 404, 'NOT_FOUND');

  const { data: related } = await supabaseAdmin
    .from('meals')
    .select('id, name, slug, price, discount_price, primary_image_url, rating_avg')
    .eq('category_id', meal.category_id)
    .eq('availability', true)
    .neq('id', meal.id)
    .limit(4);

  res.json({ success: true, meal, related: related || [] });
});

// ---------------------------------------------------------------------------
// POST /api/v1/meals  (staff+)
// ---------------------------------------------------------------------------
const create = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  payload.ingredients = toArray(payload.ingredients);
  payload.allergens = toArray(payload.allergens);
  if (payload.discount_price && payload.discount_price >= payload.price) {
    throw new AppError('Discount price must be lower than the regular price.', 400, 'INVALID_DISCOUNT');
  }

  const slug = slugify(payload.name);
  const { data, error } = await supabaseAdmin
    .from('meals')
    .insert({ ...payload, slug, created_by: req.user.id })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new AppError('A meal with this name already exists.', 409, 'DUPLICATE_MEAL');
    throw new AppError('Could not create meal.', 500, 'CREATE_FAILED');
  }

  await recordAudit({ userId: req.user.id, action: 'meal_created', resourceType: 'meal', resourceId: data.id, metadata: { name: data.name, price: data.price }, ip: req.ip });
  res.status(201).json({ success: true, meal: data });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/meals/:id  (staff+)  — covers edit, enable/disable, price change,
// discount, featured/popular flags, stock, category change — all via one
// generic partial update so the admin UI can PATCH just the fields it changed.
// ---------------------------------------------------------------------------
const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const payload = { ...req.body };
  if (payload.ingredients !== undefined) payload.ingredients = toArray(payload.ingredients);
  if (payload.allergens !== undefined) payload.allergens = toArray(payload.allergens);
  if (payload.name) payload.slug = slugify(payload.name);

  const { data, error } = await supabaseAdmin.from('meals').update(payload).eq('id', id).select().single();
  if (error || !data) throw new AppError('Meal not found.', 404, 'NOT_FOUND');

  await recordAudit({ userId: req.user.id, action: 'meal_updated', resourceType: 'meal', resourceId: id, metadata: payload, ip: req.ip });
  res.json({ success: true, meal: data });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/meals/:id  (manager+)
// ---------------------------------------------------------------------------
const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { count } = await supabaseAdmin.from('order_items').select('id', { count: 'exact', head: true }).eq('meal_id', id);
  if (count && count > 0) {
    // Meals referenced by past orders are disabled instead of hard-deleted,
    // so order history keeps working (order_items also snapshots the name/price).
    await supabaseAdmin.from('meals').update({ availability: false }).eq('id', id);
    await recordAudit({ userId: req.user.id, action: 'meal_disabled_instead_of_deleted', resourceType: 'meal', resourceId: id, ip: req.ip });
    return res.json({ success: true, message: 'This meal has order history, so it was disabled instead of deleted.' });
  }

  const { error } = await supabaseAdmin.from('meals').delete().eq('id', id);
  if (error) throw new AppError('Could not delete meal.', 500, 'DELETE_FAILED');

  await recordAudit({ userId: req.user.id, action: 'meal_deleted', resourceType: 'meal', resourceId: id, ip: req.ip });
  res.json({ success: true, message: 'Meal deleted.' });
});

// ---------------------------------------------------------------------------
// POST /api/v1/meals/:id/images  (staff+) — upload one or more images
// ---------------------------------------------------------------------------
const uploadImages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const files = req.files || [];
  if (!files.length) throw new AppError('No images uploaded.', 400, 'NO_FILE');

  const { data: meal } = await supabaseAdmin.from('meals').select('id, primary_image_url').eq('id', id).single();
  if (!meal) throw new AppError('Meal not found.', 404, 'NOT_FOUND');

  const uploaded = [];
  for (const file of files) {
    // eslint-disable-next-line no-await-in-loop
    const { url } = await uploadImage('meal-images', file, id);
    uploaded.push(url);
  }

  const rows = uploaded.map((url, i) => ({ meal_id: id, image_url: url, display_order: i }));
  const { data: images, error } = await supabaseAdmin.from('meal_images').insert(rows).select();
  if (error) throw new AppError('Images uploaded but could not be linked to the meal.', 500, 'LINK_FAILED');

  if (!meal.primary_image_url) {
    await supabaseAdmin.from('meals').update({ primary_image_url: uploaded[0] }).eq('id', id);
  }

  await recordAudit({ userId: req.user.id, action: 'meal_images_uploaded', resourceType: 'meal', resourceId: id, metadata: { count: uploaded.length }, ip: req.ip });
  res.status(201).json({ success: true, images });
});

const deleteMealImage = asyncHandler(async (req, res) => {
  const { imageId } = req.params;
  const { data: image } = await supabaseAdmin.from('meal_images').select('*').eq('id', imageId).single();
  if (!image) throw new AppError('Image not found.', 404, 'NOT_FOUND');

  await supabaseAdmin.from('meal_images').delete().eq('id', imageId);
  const path = image.image_url.split('/meal-images/')[1];
  if (path) await deleteImage('meal-images', path);

  res.json({ success: true, message: 'Image removed.' });
});

module.exports = { list, getBySlug, create, update, remove, uploadImages, deleteMealImage };
