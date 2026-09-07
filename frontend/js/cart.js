// Aroma FoodLand — cart helpers shared across pages. The cart itself is
// server-side (per-user, in the `cart_items` table) so this module is just
// a thin, reusable wrapper: add an item, refresh the header badge count.

const AromaCart = (() => {
  async function refreshBadge() {
    const badge = document.querySelector('[data-cart-count]');
    if (!badge) return;
    if (!window.AromaAuth.user) {
      badge.hidden = true;
      return;
    }
    try {
      const { cart } = await window.AromaApi.get('/cart');
      const count = cart.reduce((sum, item) => sum + item.quantity, 0);
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.hidden = count === 0;
    } catch {
      badge.hidden = true;
    }
  }

  async function addItem(mealId, quantity = 1, specialInstructions = null) {
    if (!window.AromaAuth.user) {
      window.AromaUI.toast('Please sign in to add items to your cart.', 'error');
      window.AromaAuth.requireLogin();
      return null;
    }
    const result = await window.AromaApi.post('/cart', { meal_id: mealId, quantity, special_instructions: specialInstructions });
    window.AromaUI.toast('Added to cart.', 'success');
    refreshBadge();
    return result;
  }

  return { refreshBadge, addItem };
})();

window.AromaCart = AromaCart;
