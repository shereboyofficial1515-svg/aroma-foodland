// Aroma FoodLand — frontend runtime config.
// Point this at your deployed backend URL in production. Loaded before
// every other script (see the <head> of each page).
window.AROMA_CONFIG = {
  apiBaseUrl: 'https://aroma-foodland.onrender.com/api/v1',
  paystackPublicKey: '', // filled in dynamically from /payments/initialize response
};
