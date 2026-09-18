const { supabaseAnon, supabaseAdmin, supabaseForUser } = require('../config/supabase');
const { AppError, asyncHandler } = require('../utils/AppError');
const { setSessionCookies, clearSessionCookies } = require('../utils/cookies');
const { recordAudit } = require('../services/auditService');
const { env } = require('../config/env');

// Supabase Auth errors are meant for developers, not customers — this maps
// the handful of cases we actually need to tell the customer apart (rate
// limited vs. unverified vs. everything else) onto our own error codes, so
// the frontend can show the right message/action instead of a generic one.
function isRateLimited(error) {
  return error?.status === 429 || /rate limit/i.test(error?.message || '') || error?.code === 'over_email_send_rate_limit';
}
function isEmailNotConfirmed(error) {
  return error?.code === 'email_not_confirmed' || /email not confirmed/i.test(error?.message || '');
}

// ---------------------------------------------------------------------------
// POST /api/v1/auth/register
// ---------------------------------------------------------------------------
const register = asyncHandler(async (req, res) => {
  const { full_name, email, phone, password } = req.body;

  // Supabase Auth handles password hashing/storage — we never touch raw
  // passwords beyond this single signUp call.
  const { data, error } = await supabaseAnon.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, phone },
      emailRedirectTo: `${env.frontendUrl}/verify-callback.html`,
    },
  });

  if (error) {
    if (isRateLimited(error)) {
      throw new AppError("We've sent too many verification emails recently. Please wait a while before trying again.", 429, 'EMAIL_RATE_LIMITED');
    }
    const status = error.status === 422 ? 409 : 400;
    throw new AppError(
      error.message.includes('already registered') || status === 409
        ? 'An account with this email already exists.'
        : error.message,
      status,
      'REGISTER_FAILED'
    );
  }

  if (!data.user) {
    throw new AppError('Could not create account. Please try again.', 400, 'REGISTER_FAILED');
  }

  // Create the profile row. Uses the service-role client because RLS only
  // allows a user to insert their OWN profile — but at this instant the
  // client doesn't have a session yet (email confirmation may be pending).
  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: data.user.id,
    full_name,
    phone,
    role: 'customer',
    email_verified: Boolean(data.user.email_confirmed_at),
  });

  if (profileError) {
    // Log the REAL Supabase/Postgres error server-side — the generic message
    // below is what the customer sees, but this is what you need to debug.
    console.error('[auth.register] profile insert failed:', profileError);
    // Roll back the auth user so we don't leave an orphaned account with no profile.
    await supabaseAdmin.auth.admin.deleteUser(data.user.id).catch(() => { });
    throw new AppError('Could not finish creating your account. Please try again.', 500, 'PROFILE_CREATE_FAILED');
  }

  await recordAudit({ userId: data.user.id, action: 'user_registered', resourceType: 'profile', resourceId: data.user.id, ip: req.ip });

  if (data.session) {
    setSessionCookies(res, data.session);
  }

  res.status(201).json({
    success: true,
    message: data.session
      ? 'Account created successfully.'
      : 'Account created. Please check your email to verify your address before logging in.',
    requiresEmailVerification: !data.session,
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/login
// ---------------------------------------------------------------------------
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    if (isRateLimited(error)) {
      throw new AppError("Too many attempts recently. Please wait a while before trying again.", 429, 'EMAIL_RATE_LIMITED');
    }
    if (isEmailNotConfirmed(error)) {
      throw new AppError("Your email address hasn't been verified yet. Please check your inbox and click the verification link before signing in.", 403, 'EMAIL_NOT_VERIFIED');
    }
    // Deliberately generic beyond this point — never reveal whether the email exists.
    throw new AppError('Incorrect email or password.', 401, 'INVALID_CREDENTIALS');
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    throw new AppError('Account profile not found. Please contact support.', 401, 'PROFILE_MISSING');
  }

  if (!profile.is_active) {
    throw new AppError('This account has been disabled. Please contact support.', 403, 'ACCOUNT_DISABLED');
  }

  setSessionCookies(res, data.session);
  await recordAudit({ userId: data.user.id, action: 'user_login', ip: req.ip });

  res.json({ success: true, user: { id: data.user.id, email: data.user.email, ...profile } });
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/logout
// ---------------------------------------------------------------------------
const logout = asyncHandler(async (req, res) => {
  if (req.accessToken) {
    // Best-effort server-side session revocation.
    await supabaseAdmin.auth.admin.signOut(req.accessToken).catch(() => { });
  }
  clearSessionCookies(res);
  res.json({ success: true, message: 'Logged out.' });
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/refresh
// ---------------------------------------------------------------------------
const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.body.refresh_token || req.cookies?.sb_refresh_token;
  if (!refreshToken) {
    throw new AppError('No refresh token provided.', 401, 'NO_REFRESH_TOKEN');
  }

  const { data, error } = await supabaseAnon.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) {
    clearSessionCookies(res);
    throw new AppError('Session expired. Please sign in again.', 401, 'REFRESH_FAILED');
  }

  setSessionCookies(res, data.session);
  res.json({ success: true, message: 'Session refreshed.' });
});

// ---------------------------------------------------------------------------
// GET /api/v1/auth/google  — returns the Supabase OAuth authorize URL
// ---------------------------------------------------------------------------
const googleAuthUrl = asyncHandler(async (req, res) => {
  if (!env.google.enabled) {
    throw new AppError('Google sign-in is not configured yet.', 503, 'GOOGLE_NOT_CONFIGURED');
  }
  const redirectTo = `${env.frontendUrl}/auth-callback.html`;
  const url = `${env.supabase.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
  res.json({ success: true, url });
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/session — called by the frontend after Supabase redirects
// back with tokens in the URL fragment (used for both Google OAuth and email
// confirmation links). Verifies the tokens, ensures a profile row exists,
// and sets our httpOnly session cookies.
// ---------------------------------------------------------------------------
const syncSession = asyncHandler(async (req, res) => {
  const { access_token, refresh_token } = req.body;

  const { data, error } = await supabaseAnon.auth.getUser(access_token);
  if (error || !data.user) {
    throw new AppError('Invalid or expired session.', 401, 'INVALID_SESSION');
  }

  const { data: existingProfile } = await supabaseAdmin.from('profiles').select('*').eq('id', data.user.id).single();

  let profile = existingProfile;
  if (!profile) {
    const meta = data.user.user_metadata || {};
    const { data: created, error: createError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: data.user.id,
        full_name: meta.full_name || meta.name || data.user.email.split('@')[0],
        phone: meta.phone || null,
        avatar_url: meta.avatar_url || meta.picture || null,
        role: 'customer',
        email_verified: Boolean(data.user.email_confirmed_at),
      })
      .select()
      .single();
    if (createError) {
      console.error('[auth.syncSession] profile insert failed:', createError);
      throw new AppError('Could not finish setting up your account.', 500, 'PROFILE_CREATE_FAILED');
    }
    profile = created;
    await recordAudit({ userId: data.user.id, action: 'user_registered_oauth', ip: req.ip });
  } else if (Boolean(data.user.email_confirmed_at) && !profile.email_verified) {
    await supabaseAdmin.from('profiles').update({ email_verified: true }).eq('id', data.user.id);
    profile.email_verified = true;
  }

  if (!profile.is_active) {
    throw new AppError('This account has been disabled. Please contact support.', 403, 'ACCOUNT_DISABLED');
  }

  setSessionCookies(res, { access_token, refresh_token });
  res.json({ success: true, user: { id: data.user.id, email: data.user.email, ...profile } });
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/forgot-password
// ---------------------------------------------------------------------------
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  // Always respond the same way regardless of whether the email exists,
  // to avoid leaking which addresses are registered.
  await supabaseAnon.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.frontendUrl}/reset-password.html`,
  });
  res.json({ success: true, message: 'If an account exists for that email, a reset link has been sent.' });
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/resend-verification
// ---------------------------------------------------------------------------
const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const { error } = await supabaseAnon.auth.resend({ type: 'signup', email });

  if (error && isRateLimited(error)) {
    throw new AppError('Verification email limit reached. Please wait a while before requesting another email.', 429, 'EMAIL_RATE_LIMITED');
  }

  // Same privacy pattern as forgotPassword: respond identically whether the
  // email exists, is already verified, or genuinely just got resent — never
  // let this endpoint be used to check which emails have accounts.
  res.json({ success: true, message: "If that email needs verification, we've sent a new link." });
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/reset-password  (access_token comes from the emailed link)
// ---------------------------------------------------------------------------
const resetPassword = asyncHandler(async (req, res) => {
  const { access_token, new_password } = req.body;

  const scopedClient = supabaseForUser(access_token);
  const { error } = await scopedClient.auth.updateUser({ password: new_password });

  if (error) {
    throw new AppError('This reset link is invalid or has expired. Please request a new one.', 400, 'RESET_FAILED');
  }

  res.json({ success: true, message: 'Password updated. You can now sign in with your new password.' });
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/change-password  (logged-in user changing their own password)
// ---------------------------------------------------------------------------
const changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;

  // Re-verify the current password before allowing a change.
  const { error: verifyError } = await supabaseAnon.auth.signInWithPassword({
    email: req.user.email,
    password: current_password,
  });
  if (verifyError) {
    throw new AppError('Current password is incorrect.', 401, 'INVALID_CREDENTIALS');
  }

  const scopedClient = supabaseForUser(req.accessToken);
  const { error } = await scopedClient.auth.updateUser({ password: new_password });
  if (error) {
    throw new AppError('Could not update password. Please try again.', 500, 'PASSWORD_UPDATE_FAILED');
  }

  await recordAudit({ userId: req.user.id, action: 'password_changed', ip: req.ip });
  res.json({ success: true, message: 'Password updated successfully.' });
});

// ---------------------------------------------------------------------------
// GET /api/v1/auth/me
// ---------------------------------------------------------------------------
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: { id: req.user.id, email: req.user.email, ...req.user.profile } });
});

module.exports = {
  register,
  login,
  logout,
  refresh,
  googleAuthUrl,
  syncSession,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
};