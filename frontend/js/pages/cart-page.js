document.addEventListener('DOMContentLoaded', async () => {
  const { formatNaira } = window.AromaRender;
  const { toast, confirmModal, emptyState, friendlyError } = window.AromaUI;

  const itemsEl = document.getElementById('cart-items');
  const subtotalEl = document.getElementById('cart-subtotal');
  const checkoutBtn = document.getElementById('checkout-btn');

  await window.AromaAuth.init();
  if (!window.AromaAuth.user) {
    itemsEl.innerHTML = emptyState({ icon: 'cart', title: 'Sign in to view your cart', message: 'Your cart is saved to your account.' }) +
      `<a href="login.html?next=cart.html" class="btn btn-primary" style="display:block;width:fit-content;margin:0 auto;">Sign in</a>`;
    checkoutBtn.classList.add('btn-disabled');
    checkoutBtn.setAttribute('aria-disabled', 'true');
    checkoutBtn.addEventListener('click', (e) => e.preventDefault());
    subtotalEl.textContent = formatNaira(0);
    return;
  }

  function lineHtml(item) {
    const meal = item.meal;
    return `
      <div class="cart-line" data-item-id="${item.id}">
        <div class="cart-line-media">
          ${meal?.primary_image_url ? `<img src="${meal.primary_image_url}" alt="${meal.name}" style="width:100%;height:100%;object-fit:cover;" />` : `<div class="img-placeholder"><i data-icon="utensils" data-size="20"></i></div>`}
        </div>
        <div style="flex:1;">
          <div class="flex-between">
            <h4>${meal?.name || 'Meal no longer available'}</h4>
            <button class="icon-btn" aria-label="Remove item" data-remove="${item.id}">${AromaIcons.icon('trash', { size: 16 })}</button>
          </div>
          ${item.unavailable ? `<span class="badge badge-error" style="margin:4px 0;">Unavailable — please remove</span>` : ''}
          ${item.special_instructions ? `<p style="font-size:var(--fs-xs);" class="text-muted">"${item.special_instructions}"</p>` : ''}
          <div class="flex-between" style="margin-top:var(--space-2);">
            <div class="cart-line-qty">
              <button class="btn btn-ghost btn-icon" data-qty-minus="${item.id}" aria-label="Decrease quantity">${AromaIcons.icon('minus', { size: 14 })}</button>
              <input type="number" value="${item.quantity}" min="1" max="50" data-qty-input="${item.id}" aria-label="Quantity" />
              <button class="btn btn-ghost btn-icon" data-qty-plus="${item.id}" aria-label="Increase quantity">${AromaIcons.icon('plus', { size: 14 })}</button>
            </div>
            <strong>${formatNaira(item.line_total)}</strong>
          </div>
        </div>
      </div>`;
  }

  async function load() {
    itemsEl.innerHTML = `<div class="skeleton" style="height:96px;margin-bottom:12px;"></div>`.repeat(3);
    try {
      const { cart, subtotal } = await window.AromaApi.get('/cart');
      subtotalEl.textContent = formatNaira(subtotal);

      if (!cart.length) {
        itemsEl.innerHTML = emptyState({ icon: 'cart', title: 'Your cart is empty', message: 'Add something delicious from the menu.' }) +
          `<a href="menu.html" class="btn btn-primary" style="display:block;width:fit-content;margin:0 auto;">Browse the menu</a>`;
        return;
      }

      itemsEl.innerHTML = cart.map(lineHtml).join('');
      AromaIcons.hydrateIcons(itemsEl);
      bindEvents();
    } catch (err) {
      itemsEl.innerHTML = emptyState({ icon: 'alertCircle', title: 'Could not load your cart', message: friendlyError(err) });
    }
  }

  function bindEvents() {
    itemsEl.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ok = await confirmModal({ title: 'Remove item?', message: 'This will remove the item from your cart.', confirmLabel: 'Remove', danger: true });
        if (!ok) return;
        try {
          await window.AromaApi.delete(`/cart/${btn.getAttribute('data-remove')}`);
          window.AromaCart.refreshBadge();
          load();
        } catch (err) { toast(friendlyError(err), 'error'); }
      });
    });

    async function updateQty(id, qty) {
      try {
        await window.AromaApi.patch(`/cart/${id}`, { quantity: qty });
        window.AromaCart.refreshBadge();
        load();
      } catch (err) { toast(friendlyError(err), 'error'); load(); }
    }

    itemsEl.querySelectorAll('[data-qty-minus]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = itemsEl.querySelector(`[data-qty-input="${btn.getAttribute('data-qty-minus')}"]`);
        const val = Math.max(1, Number(input.value) - 1);
        updateQty(btn.getAttribute('data-qty-minus'), val);
      });
    });
    itemsEl.querySelectorAll('[data-qty-plus]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = itemsEl.querySelector(`[data-qty-input="${btn.getAttribute('data-qty-plus')}"]`);
        const val = Math.min(50, Number(input.value) + 1);
        updateQty(btn.getAttribute('data-qty-plus'), val);
      });
    });
    itemsEl.querySelectorAll('[data-qty-input]').forEach((input) => {
      input.addEventListener('change', () => updateQty(input.getAttribute('data-qty-input'), Math.max(1, Number(input.value))));
    });
  }

  load();
});
