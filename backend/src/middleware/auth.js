const { supabaseAnon, supabaseAdmin } = require('../config/supabase');
const { AppError, asyncHandler } = require('../utils/AppError');

function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  if (req.cookies && req.cookies.sb_access_token) return req.cookies.sb_access_token;
  return null;
}

// Requires a valid session. Attaches req.user = { id, email, profile }.
const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    throw new AppError('You need to be signed in to do that.', 401, 'UNAUTHENTICATED');
  }

  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data.user) {
    throw new AppError('Your session has expired. Please sign in again.', 401, 'INVALID_SESSION');
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    throw new AppError('Account profile not found.', 401, 'PROFILE_MISSING');
  }

  if (!profile.is_active) {
    throw new AppError('This account has been disabled. Please contact support.', 403, 'ACCOUNT_DISABLED');
  }

  req.user = { id: data.user.id, email: data.user.email, authUser: data.user, profile };
  req.accessToken = token;
  next();
});

// Attaches req.user if a valid session is present, but never throws.
// Useful for endpoints (like the AI assistant or reviews) that behave
// slightly differently for logged-in vs. guest users.
const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();

  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data.user) return next();

  const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', data.user.id).single();
  if (profile && profile.is_active) {
    req.user = { id: data.user.id, email: data.user.email, authUser: data.user, profile };
    req.accessToken = token;
  }
  next();
});

module.exports = { protect, optionalAuth, extractToken };
