// Aroma FoodLand — client-side auth state.
// The session lives in httpOnly cookies (set by the backend), so this
// module can't read the token directly — it asks the backend who's
// logged in via /auth/me and caches the result for the duration of the
// page, broadcasting an event whenever it changes so header.js / any page
// can react without tight coupling.

const AromaAuth = (() => {
  let currentUser = null;
  let initialized = false;

  function broadcast() {
    document.dispatchEvent(new CustomEvent('aroma:auth-changed', { detail: { user: currentUser } }));
  }

  async function init() {
    try {
      const { user } = await window.AromaApi.get('/auth/me');
      currentUser = user;
    } catch {
      currentUser = null;
    }
    initialized = true;
    broadcast();
    return currentUser;
  }

  async function login(email, password) {
    const { user } = await window.AromaApi.post('/auth/login', { email, password });
    currentUser = user;
    broadcast();
    return user;
  }

  async function register(payload) {
    return window.AromaApi.post('/auth/register', payload);
  }

  async function logout() {
    await window.AromaApi.post('/auth/logout').catch(() => {});
    currentUser = null;
    broadcast();
  }

  function isStaff() {
    return currentUser && ['staff', 'manager', 'admin', 'super_admin'].includes(currentUser.role);
  }

  function requireLogin(redirectTo = 'login.html') {
    if (!currentUser) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `${redirectTo}?next=${next}`;
      return false;
    }
    return true;
  }

  return {
    init,
    login,
    register,
    logout,
    isStaff,
    requireLogin,
    get user() { return currentUser; },
    get isReady() { return initialized; },
  };
})();

window.AromaAuth = AromaAuth;
