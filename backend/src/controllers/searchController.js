const { supabaseAdmin } = require('../config/supabase');
const { AppError, asyncHandler } = require('../utils/AppError');
const { searchKnowledge } = require('../utils/restaurantKnowledge');

const search = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q || q.length < 2) {
    return res.json({ success: true, query: q, meals: [], categories: [], services: [], faqs: [] });
  }

  const { data: meals, error: mealsError } = await supabaseAdmin
    .from('meals')
    .select('id, name, slug, price, discount_price, primary_image_url, availability')
    .ilike('name', `%${q}%`)
    .eq('availability', true)
    .limit(10);
  if (mealsError) {
    console.error('[searchController] database error:', mealsError);
    throw new AppError('Search failed. Please try again.', 500, 'SEARCH_FAILED');
  }
  const { data: categories } = await supabaseAdmin
    .from('meal_categories')
    .select('id, name, slug')
    .ilike('name', `%${q}%`)
    .eq('is_active', true)
    .limit(10);

  const { services, faqs } = await searchKnowledge(q);

  res.json({
    success: true,
    query: q,
    meals: meals || [],
    categories: categories || [],
    services,
    faqs,
    empty: (meals?.length || 0) === 0 && (categories?.length || 0) === 0 && services.length === 0 && faqs.length === 0,
  });
});

module.exports = { search };