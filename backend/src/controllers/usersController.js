const { supabaseAdmin } = require('../config/supabase');
const { AppError, asyncHandler } = require('../utils/AppError');
const { ROLE_RANK } = require('../middleware/roles');
const { recordAudit } = require('../services/auditService');

// ---------------------------------------------------------------------------
// GET /api/v1/users  (staff+) — search + role filter + pagination
// ---------------------------------------------------------------------------
const list = asyncHandler(async (req, res) => {
  const { search, role, page = 1, limit = 20 } = req.query;

  let query = supabaseAdmin.from('profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false });
  if (search) query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
  if (role) query = query.eq('role', role);

  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new AppError('Could not load customers.', 500, 'FETCH_FAILED');

  res.json({ success: true, users: data, pagination: { page: Number(page), limit: Number(limit), total: count || 0 } });
});

// ---------------------------------------------------------------------------
// GET /api/v1/users/:id  (staff+, or self)
// ---------------------------------------------------------------------------
const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isStaff = ['staff', 'manager', 'admin', 'super_admin'].includes(req.user.profile.role);
  if (id !== req.user.id && !isStaff) throw new AppError("You don't have permission to view this profile.", 403, 'FORBIDDEN');

  const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('id', id).single();
  if (error || !data) throw new AppError('User not found.', 404, 'NOT_FOUND');
  res.json({ success: true, user: data });
});

// ---------------------------------------------------------------------------
// GET /api/v1/users/:id/orders  (staff+, or self)
// ---------------------------------------------------------------------------
const getOrders = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isStaff = ['staff', 'manager', 'admin', 'super_admin'].includes(req.user.profile.role);
  if (id !== req.user.id && !isStaff) throw new AppError("You don't have permission to view this.", 403, 'FORBIDDEN');

  const { data, error } = await supabaseAdmin.from('orders').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(50);
  if (error) throw new AppError('Could not load orders.', 500, 'FETCH_FAILED');
  res.json({ success: true, orders: data });
});

// ---------------------------------------------------------------------------
// GET /api/v1/users/:id/reservations  (staff+, or self)
// ---------------------------------------------------------------------------
const getReservations = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isStaff = ['staff', 'manager', 'admin', 'super_admin'].includes(req.user.profile.role);
  if (id !== req.user.id && !isStaff) throw new AppError("You don't have permission to view this.", 403, 'FORBIDDEN');

  const { data, error } = await supabaseAdmin.from('reservations').select('*').eq('user_id', id).order('reservation_date', { ascending: false }).limit(50);
  if (error) throw new AppError('Could not load reservations.', 500, 'FETCH_FAILED');
  res.json({ success: true, reservations: data });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/users/:id/role  (admin+) — cannot grant a role higher than
// your own, and cannot change your own role (prevents accidental self-lockout
// or self-escalation via a compromised session).
// ---------------------------------------------------------------------------
const updateRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (id === req.user.id) throw new AppError('You cannot change your own role.', 400, 'CANNOT_SELF_MODIFY');

  const callerRank = ROLE_RANK[req.user.profile.role];
  if (ROLE_RANK[role] > callerRank) {
    throw new AppError("You can't assign a role higher than your own.", 403, 'FORBIDDEN');
  }

  const { data: target } = await supabaseAdmin.from('profiles').select('role').eq('id', id).single();
  if (!target) throw new AppError('User not found.', 404, 'NOT_FOUND');
  if (ROLE_RANK[target.role] >= callerRank && req.user.profile.role !== 'super_admin') {
    throw new AppError("You can't modify a user with an equal or higher role than yours.", 403, 'FORBIDDEN');
  }

  const { data, error } = await supabaseAdmin.from('profiles').update({ role }).eq('id', id).select().single();
  if (error) throw new AppError('Could not update role.', 500, 'UPDATE_FAILED');

  await recordAudit({ userId: req.user.id, action: 'user_role_changed', resourceType: 'profile', resourceId: id, metadata: { new_role: role }, ip: req.ip });
  res.json({ success: true, user: data });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/users/:id/status  (staff+) — enable/disable an account
// ---------------------------------------------------------------------------
const updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  if (id === req.user.id) throw new AppError('You cannot disable your own account.', 400, 'CANNOT_SELF_MODIFY');

  const { data, error } = await supabaseAdmin.from('profiles').update({ is_active }).eq('id', id).select().single();
  if (error || !data) throw new AppError('User not found.', 404, 'NOT_FOUND');

  await recordAudit({ userId: req.user.id, action: is_active ? 'user_enabled' : 'user_disabled', resourceType: 'profile', resourceId: id, ip: req.ip });
  res.json({ success: true, user: data });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/users/me — the logged-in user editing their own profile.
// Deliberately separate from the admin-facing updateRole/updateStatus below:
// a customer can never touch their own role or active status this way.
// ---------------------------------------------------------------------------
const updateMe = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('profiles').update(req.body).eq('id', req.user.id).select().single();
  if (error) throw new AppError('Could not update your profile.', 500, 'UPDATE_FAILED');
  res.json({ success: true, user: data });
});

module.exports = { list, getById, getOrders, getReservations, updateRole, updateStatus, updateMe };
