const { supabaseAdmin } = require('../config/supabase');
const { AppError, asyncHandler } = require('../utils/AppError');
const { recordAudit } = require('../services/auditService');

// ---------------------------------------------------------------------------
// GET /api/v1/promotions — public: only currently-active promotions
// (the same window RLS enforces in policies.sql for direct Supabase reads)
// ---------------------------------------------------------------------------
const list = asyncHandler(async (req, res) => {
  const isStaff = req.user && ['staff', 'manager', 'admin', 'super_admin'].includes(req.user.profile.role);
  const nowIso = new Date().toISOString();

  let query = supabaseAdmin.from('promotions').select('*').order('starts_at', { ascending: false });
  if (!isStaff) {
    query = query.eq('is_active', true).lte('starts_at', nowIso).or(`ends_at.is.null,ends_at.gte.${nowIso}`);
  }

  const { data, error } = await query;
  if (error) throw new AppError('Could not load promotions.', 500, 'FETCH_FAILED');
  res.json({ success: true, promotions: data });
});

// ---------------------------------------------------------------------------
// POST /api/v1/promotions  (staff+) — { title, message, target_audience,
// starts_at, ends_at, is_active, broadcast: boolean }
// broadcast=true also creates a `notifications` row for every user in the
// target audience, so it shows up in their notification center immediately.
// ---------------------------------------------------------------------------
const create = asyncHandler(async (req, res) => {
  const { broadcast, ...payload } = req.body;

  const { data: promo, error } = await supabaseAdmin
    .from('promotions')
    .insert({ ...payload, created_by: req.user.id })
    .select()
    .single();
  if (error) throw new AppError('Could not create promotion.', 500, 'CREATE_FAILED');

  let notifiedCount = 0;
  if (broadcast) {
    let userQuery = supabaseAdmin.from('profiles').select('id').eq('is_active', true);
    if (promo.target_audience === 'customers') userQuery = userQuery.eq('role', 'customer');
    if (promo.target_audience === 'staff') userQuery = userQuery.in('role', ['staff', 'manager', 'admin', 'super_admin']);

    const { data: targetUsers } = await userQuery;
    if (targetUsers?.length) {
      const rows = targetUsers.map((u) => ({
        user_id: u.id,
        type: 'promotion',
        title: promo.title,
        message: promo.message,
        metadata: { promotion_id: promo.id },
      }));
      // Insert in chunks to stay well under any single-request payload limits.
      for (let i = 0; i < rows.length; i += 500) {
        // eslint-disable-next-line no-await-in-loop
        await supabaseAdmin.from('notifications').insert(rows.slice(i, i + 500));
      }
      notifiedCount = rows.length;
    }
  }

  await recordAudit({ userId: req.user.id, action: 'promotion_created', resourceType: 'promotion', resourceId: promo.id, metadata: { broadcast, notifiedCount }, ip: req.ip });
  res.status(201).json({ success: true, promotion: promo, notified_count: notifiedCount });
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin.from('promotions').update(req.body).eq('id', id).select().single();
  if (error || !data) throw new AppError('Promotion not found.', 404, 'NOT_FOUND');
  res.json({ success: true, promotion: data });
});

const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error } = await supabaseAdmin.from('promotions').delete().eq('id', id);
  if (error) throw new AppError('Could not delete promotion.', 500, 'DELETE_FAILED');
  await recordAudit({ userId: req.user.id, action: 'promotion_deleted', resourceType: 'promotion', resourceId: id, ip: req.ip });
  res.json({ success: true, message: 'Promotion deleted.' });
});

module.exports = { list, create, update, remove };
