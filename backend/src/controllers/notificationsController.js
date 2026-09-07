const { supabaseAdmin } = require('../config/supabase');
const { AppError, asyncHandler } = require('../utils/AppError');

// ---------------------------------------------------------------------------
// GET /api/v1/notifications  — paginated, newest first
// ---------------------------------------------------------------------------
const list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unread_only } = req.query;

  let query = supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (unread_only === 'true') query = query.eq('is_read', false);

  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new AppError('Could not load notifications.', 500, 'FETCH_FAILED');

  const { count: unreadCount } = await supabaseAdmin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', req.user.id)
    .eq('is_read', false);

  res.json({
    success: true,
    notifications: data,
    unread_count: unreadCount || 0,
    pagination: { page: Number(page), limit: Number(limit), total: count || 0 },
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/notifications/:id/read
// ---------------------------------------------------------------------------
const markRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select()
    .single();
  if (error || !data) throw new AppError('Notification not found.', 404, 'NOT_FOUND');
  res.json({ success: true, notification: data });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/notifications/read-all
// ---------------------------------------------------------------------------
const markAllRead = asyncHandler(async (req, res) => {
  const { error } = await supabaseAdmin.from('notifications').update({ is_read: true }).eq('user_id', req.user.id).eq('is_read', false);
  if (error) throw new AppError('Could not update notifications.', 500, 'UPDATE_FAILED');
  res.json({ success: true, message: 'All notifications marked as read.' });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/notifications/:id
// ---------------------------------------------------------------------------
const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error } = await supabaseAdmin.from('notifications').delete().eq('id', id).eq('user_id', req.user.id);
  if (error) throw new AppError('Could not delete notification.', 500, 'DELETE_FAILED');
  res.json({ success: true, message: 'Notification deleted.' });
});

module.exports = { list, markRead, markAllRead, remove };
