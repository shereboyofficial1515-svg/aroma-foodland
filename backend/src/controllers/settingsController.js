const { supabaseAdmin } = require('../config/supabase');
const { AppError, asyncHandler } = require('../utils/AppError');
const { recordAudit } = require('../services/auditService');

// ---------------------------------------------------------------------------
// GET /api/v1/settings/public — safe subset for the public site (footer,
// contact page, checkout delivery fee, etc.) — no AI prompt or internal config.
// ---------------------------------------------------------------------------
const getPublic = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('restaurant_settings')
    .select('name, phone, address, opening_hours, delivery_fee, minimum_order, currency')
    .eq('id', 1)
    .single();
  if (error) throw new AppError('Could not load restaurant settings.', 500, 'FETCH_FAILED');
  res.json({ success: true, settings: data });
});

// ---------------------------------------------------------------------------
// GET /api/v1/settings  (staff+) — full settings incl. email, tax, capacity
// ---------------------------------------------------------------------------
const getAll = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('restaurant_settings').select('*').eq('id', 1).single();
  if (error) throw new AppError('Could not load settings.', 500, 'FETCH_FAILED');
  res.json({ success: true, settings: data });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/settings  (admin+)
// ---------------------------------------------------------------------------
const update = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('restaurant_settings').update(req.body).eq('id', 1).select().single();
  if (error) throw new AppError('Could not update settings.', 500, 'UPDATE_FAILED');

  await recordAudit({ userId: req.user.id, action: 'settings_updated', resourceType: 'restaurant_settings', metadata: req.body, ip: req.ip });
  res.json({ success: true, settings: data });
});

module.exports = { getPublic, getAll, update };
