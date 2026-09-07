document.addEventListener('DOMContentLoaded', async () => {
  const { formatNaira } = window.AromaRender;
  const { toast, friendlyError, withButtonLoading } = window.AromaUI;

  await window.AromaAuth.init();
  if (!window.AromaAuth.requireLogin('login.html')) return;

  const form = document.getElementById('checkout-form');
  const itemsEl = document.getElementById('checkout-items');
  const subtotalEl = document.getElementById('checkout-subtotal');
  const deliveryEl = document.getElementById('checkout-delivery');
  const totalEl = document.getElementById('checkout-total');
  const addressField = document.getElementById('address-field');
  const submitBtn = document.getElementById('submit-order-btn');

  const user = window.AromaAuth.user;
  document.getElementById('customer_name').value = user.full_name || '';
  document.getElementById('customer_phone').value = user.phone || '';

  let deliveryFee = 0;
  let cartEmpty = true;

  async function loadSummary() {
    try {
      const [{ cart, subtotal }, { settings }] = await Promise.all([
        window.AromaApi.get('/cart'),
        window.AromaApi.get('/settings/public'),
      ]);
      cartEmpty = cart.length === 0;
      if (cartEmpty) {
        itemsEl.innerHTML = `<p class="text-muted">Your cart is empty. <a href="menu.html">Browse the menu</a>.</p>`;
        submitBtn.disabled = true;
        return;
      }
      itemsEl.innerHTML = cart.map((i) => `<div class="flex-between" style="margin-bottom:4px;"><span>${i.quantity}× ${i.meal?.name || 'Item'}</span><span>${formatNaira(i.line_total)}</span></div>`).join('');
      deliveryFee = Number(settings.delivery_fee || 0);
      updateTotals(subtotal);
    } catch (err) {
      toast(friendlyError(err), 'error');
    }
  }

  function updateTotals(subtotal) {
    const orderType = form.order_type.value;
    const fee = orderType === 'delivery' ? deliveryFee : 0;
    subtotalEl.textContent = formatNaira(subtotal);
    deliveryEl.textContent = formatNaira(fee);
    totalEl.textContent = formatNaira(subtotal + fee);
    addressField.style.display = orderType === 'delivery' ? '' : 'none';
  }

  document.querySelectorAll('input[name="order_type"]').forEach((r) => r.addEventListener('change', loadSummary));

  function showError(fieldId, show) {
    document.getElementById(fieldId).closest('.field')?.classList.toggle('has-error', show);
  }

  function validate() {
    let valid = true;
    const name = document.getElementById('customer_name').value.trim();
    const phone = document.getElementById('customer_phone').value.trim();
    const email = document.getElementById('customer_email').value.trim();
    const orderType = form.order_type.value;
    const address = document.getElementById('delivery_address_text').value.trim();

    showError('customer_name', !name); if (!name) valid = false;
    showError('customer_phone', phone.length < 7); if (phone.length < 7) valid = false;
    showError('customer_email', !/^\S+@\S+\.\S+$/.test(email)); if (!/^\S+@\S+\.\S+$/.test(email)) valid = false;
    if (orderType === 'delivery') { showError('delivery_address_text', !address); if (!address) valid = false; }
    return valid;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (cartEmpty) return;
    if (!validate()) { toast('Please fix the highlighted fields.', 'error'); return; }

    const run = withButtonLoading(submitBtn, async () => {
      try {
        const idempotencyKey = (crypto.randomUUID ? crypto.randomUUID() : `ord_${Date.now()}_${Math.random()}`);
        const { order } = await window.AromaApi.post('/orders', {
          order_type: form.order_type.value,
          customer_name: document.getElementById('customer_name').value.trim(),
          customer_phone: document.getElementById('customer_phone').value.trim(),
          customer_email: document.getElementById('customer_email').value.trim(),
          delivery_address_text: document.getElementById('delivery_address_text').value.trim() || null,
          special_instructions: document.getElementById('special_instructions').value.trim() || null,
          idempotency_key: idempotencyKey,
        });

        const { authorization_url } = await window.AromaApi.post('/payments/initialize', { order_id: order.id });
        window.AromaCart.refreshBadge();
        window.location.href = authorization_url;
      } catch (err) {
        toast(friendlyError(err), 'error');
      }
    });
    run();
  });

  loadSummary();
});
