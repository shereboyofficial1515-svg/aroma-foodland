document.addEventListener('DOMContentLoaded', async () => {
  const { formatNaira } = window.AromaRender;
  const { friendlyError } = window.AromaUI;
  const contentEl = document.getElementById('confirmation-content');

  await window.AromaAuth.init();
  if (!window.AromaAuth.user) {
    contentEl.innerHTML = `<h2>Please sign in</h2><p>Sign in to view your order confirmation.</p><a href="login.html" class="btn btn-primary">Sign in</a>`;
    return;
  }

  const reference = new URLSearchParams(window.location.search).get('ref') || new URLSearchParams(window.location.search).get('reference');
  if (!reference) {
    contentEl.innerHTML = `<h2>No payment reference found</h2><p>If you completed a payment, check "My Orders" for its status.</p><a href="orders.html" class="btn btn-primary">View my orders</a>`;
    return;
  }

  try {
    const { payment, order } = await window.AromaApi.get(`/payments/verify/${reference}`);

    if (payment.payment_status === 'paid') {
      contentEl.innerHTML = `
        <div style="width:64px;height:64px;border-radius:50%;background:var(--success-color);color:#fff;display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-4);">${AromaIcons.icon('check', { size: 32 })}</div>
        <h2>Order confirmed!</h2>
        <p>Thank you — order <strong>#${order.order_number}</strong> has been received and paid.</p>
        <p class="lede" style="margin:0 auto;">Total: <strong>${formatNaira(order.total)}</strong></p>
        <div class="flex-center gap-3" style="margin-top:var(--space-6);">
          <a href="order-details.html?id=${order.id}" class="btn btn-primary">Track this order</a>
          <a href="menu.html" class="btn btn-outline">Order more</a>
        </div>`;
    } else {
      contentEl.innerHTML = `
        <div style="width:64px;height:64px;border-radius:50%;background:var(--error-color);color:#fff;display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-4);">${AromaIcons.icon('alertCircle', { size: 32 })}</div>
        <h2>Payment could not be verified</h2>
        <p>If money was deducted from your account, please contact support with reference <strong>${reference}</strong>.</p>
        <a href="contact.html" class="btn btn-primary" style="margin-top:var(--space-4);">Contact support</a>`;
    }
  } catch (err) {
    contentEl.innerHTML = `
      <h2>We couldn't confirm this payment</h2>
      <p>${friendlyError(err)}</p>
      <p class="text-muted" style="font-size:var(--fs-sm);">Reference: ${reference}</p>
      <a href="contact.html" class="btn btn-primary" style="margin-top:var(--space-4);">Contact support</a>`;
  }
});
