const { createClient } = require('@supabase/supabase-js');
const { env } = require('./env');

// Service-role client: full DB access, bypasses RLS. Use ONLY in trusted
// server-side code paths after you've done your own authorization checks
// (see middleware/auth.js and middleware/roles.js).
const supabaseAdmin = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Anon client: respects RLS. Useful for verifying a user's JWT against
// Supabase Auth, or any read that should be governed by the policies in
// database/policies.sql rather than blanket backend trust.
const supabaseAnon = createClient(env.supabase.url, env.supabase.anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Builds a request-scoped client that acts AS the logged-in user (RLS
// enforced as that user), by forwarding their Supabase access token.
function supabaseForUser(accessToken) {
  return createClient(env.supabase.url, env.supabase.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

module.exports = { supabaseAdmin, supabaseAnon, supabaseForUser };
