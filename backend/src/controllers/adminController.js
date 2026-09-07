const { supabaseAdmin } = require('../config/supabase');
const { AppError, asyncHandler } = require('../utils/AppError');

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function startOfWeekIso() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function startOfMonthIso() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// GET /api/v1/admin/dashboard  (staff+) — every figure here is a real query
// against the database, computed at request time. Nothing is hardcoded or
// estimated (per spec section 59: "Do not fabricate analytics").
// ---------------------------------------------------------------------------
const dashboard = asyncHandler(async (req, res) => {
  const todayIso = startOfTodayIso();
  const weekIso = startOfWeekIso();
  const monthIso = startOfMonthIso();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: todayOrders },
    { data: weekOrders },
    { data: monthOrders },
    { count: pendingOrders },
    { count: completedOrders },
    { count: reservationsToday },
    { count: pendingReservations },
    { count: totalCustomers },
    { data: popularMeals },
    { data: recentOrders },
    { data: recentReviews },
  ] = await Promise.all([
    supabaseAdmin.from('orders').select('total, status').gte('created_at', todayIso),
    supabaseAdmin.from('orders').select('total, created_at').gte('created_at', weekIso).neq('status', 'cancelled'),
    supabaseAdmin.from('orders').select('total').gte('created_at', monthIso).neq('status', 'cancelled'),
    supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    supabaseAdmin.from('reservations').select('id', { count: 'exact', head: true }).eq('reservation_date', today),
    supabaseAdmin.from('reservations').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
    supabaseAdmin.from('meals').select('name, rating_avg, rating_count, is_popular').order('rating_count', { ascending: false }).limit(5),
    supabaseAdmin.from('orders').select('id, order_number, customer_name, total, status, created_at').order('created_at', { ascending: false }).limit(8),
    supabaseAdmin.from('reviews').select('id, rating, comment, is_approved, created_at, profiles(full_name)').order('created_at', { ascending: false }).limit(5),
  ]);

  const sumTotal = (rows) => (rows || []).reduce((acc, r) => acc + Number(r.total || 0), 0);

  // Build a simple daily revenue series for the last 7 days (for a chart).
  const revenueByDay = {};
  (weekOrders || []).forEach((o) => {
    const day = o.created_at.slice(0, 10);
    revenueByDay[day] = (revenueByDay[day] || 0) + Number(o.total);
  });
  const revenueChart = Object.entries(revenueByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, total]) => ({ date, total }));

  res.json({
    success: true,
    dashboard: {
      today_sales: sumTotal((todayOrders || []).filter((o) => o.status !== 'cancelled')),
      week_sales: sumTotal(weekOrders),
      month_sales: sumTotal(monthOrders),
      orders_today: (todayOrders || []).length,
      pending_orders: pendingOrders || 0,
      completed_orders: completedOrders || 0,
      reservations_today: reservationsToday || 0,
      pending_reservations: pendingReservations || 0,
      total_customers: totalCustomers || 0,
      popular_meals: popularMeals || [],
      revenue_chart: revenueChart,
      recent_orders: recentOrders || [],
      recent_reviews: recentReviews || [],
    },
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/admin/audit-logs  (admin+)
// ---------------------------------------------------------------------------
const auditLogs = asyncHandler(async (req, res) => {
  const { action, page = 1, limit = 50 } = req.query;
  let query = supabaseAdmin
    .from('audit_logs')
    .select('*, profiles(full_name, role)', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (action) query = query.eq('action', action);

  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error('[adminController] database error:', error);
    throw new AppError('Could not load audit logs.', 500, 'FETCH_FAILED');
  }
  res.json({ success: true, logs: data, pagination: { page: Number(page), limit: Number(limit), total: count || 0 } });
});

module.exports = { dashboard, auditLogs };
