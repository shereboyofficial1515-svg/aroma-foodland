const { supabaseAdmin } = require('../config/supabase');

// Central place that creates `notifications` rows. Keeping this as one
// function (rather than scattering .insert() calls across controllers)
// means every notification type in the spec goes through the same shape
// and is easy to extend (e.g. push notifications later).
async function notify({ userId, type, title, message, metadata = null }) {
  if (!userId) return null; // guest orders/bookings have no account to notify
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .insert({ user_id: userId, type, title, message, metadata })
    .select()
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[notify] failed to create notification:', error.message);
    return null;
  }
  return data;
}

module.exports = { notify };
