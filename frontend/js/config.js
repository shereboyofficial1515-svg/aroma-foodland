// Aroma FoodLand — frontend runtime config.
// This is a static, no-build site, so there's no bundler to inject a real
// environment variable at build time — the closest equivalent is detecting
// the environment at runtime from the page's own hostname, so the exact
// same committed file works correctly on localhost AND in production
// without ever needing to be hand-edited and re-committed per environment
// (that manual toggle is exactly how the production API URL previously
// got shipped pointed at localhost and broke every data-dependent page).
const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);

window.AROMA_CONFIG = {
  apiBaseUrl: isLocalDev ? 'http://localhost:5000/api/v1' : 'https://aroma-foodland.onrender.com/api/v1',
  paystackPublicKey: '', // filled in dynamically from /payments/initialize response
};
