const { supabaseAdmin } = require('../config/supabase');

// Fire-and-forget audit log write. Never throws into the caller's request
// flow — an audit log failure should be logged, not block the user's action.
async function recordAudit({ userId = null, action, resourceType = null, resourceId = null, metadata = null, ip = null }) {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId ? String(resourceId) : null,
      metadata,
      ip_address: ip,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[audit] failed to record audit log:', err.message);
  }
}

module.exports = { recordAudit };
