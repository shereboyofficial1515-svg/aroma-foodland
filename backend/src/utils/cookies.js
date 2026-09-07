const { env } = require('../config/env');

const baseOpts = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
  path: '/',
};

function setSessionCookies(res, session) {
  // Supabase access tokens are short-lived (default 1h); refresh_token is
  // longer-lived and used by /auth/refresh to mint new access tokens.
  res.cookie('sb_access_token', session.access_token, {
    ...baseOpts,
    maxAge: 60 * 60 * 1000, // 1 hour
  });
  res.cookie('sb_refresh_token', session.refresh_token, {
    ...baseOpts,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

function clearSessionCookies(res) {
  res.clearCookie('sb_access_token', baseOpts);
  res.clearCookie('sb_refresh_token', baseOpts);
}

module.exports = { setSessionCookies, clearSessionCookies };
