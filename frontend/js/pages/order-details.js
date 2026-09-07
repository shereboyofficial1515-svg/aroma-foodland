const TIMELINE_STEPS = ['pending', 'confirmed', 'preparing', 'ready', 'completed'];
const TIMELINE_LABELS = { pending: 'Placed', confirmed: 'Confirmed', preparing: 'Preparing', ready: 'Ready', completed: 'Completed' };

document.addEventListener('DOMContentLoaded', async () => {
  const { formatNaira } = window.AromaRender;
  const { emptyState, friendlyError } = window.AromaUI;
  const contentEl = document.getElementById('order-content');

  await window.AromaAuth.init();
  if (!window.AromaAuth.requireLogin()) return;

  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { contentEl.innerHTML = emptyState({ icon: 'alertCircle', title: 'Order not found', message: '' }); return; }

  try {
    const { order } = await window.AromaApi.get(`/orders/${id}`);

    let timelineHtml = '';
    if (order.status === 'cancelled' || order.status === 'refunded') {
      timelineHtml = `<div class="badge badge-error" style="font-size:var(--fs-sm);">This order was ${order.status}</div>`;
    } else {
      const currentIndex = TIMELINE_STEPS.indexOf(order.status === 'out_for_delivery' ? 'ready' : order.status);
      timelineHtml = `<div class="timeline">${TIMELINE_STEPS.map((step, i) => `
        <div class="timeline-step ${i < currentIndex ? 'is-done' : ''} ${i === currentIndex ? 'is-current' : ''}">
          <div class="timeline-dot">${i <= currentIndex ? AromaIcons.icon('check', { size: 14 }) : ''}</div>
          <div class="timeline-label">${TIMELINE_LABELS[step]}</div>
        </div>`).join('')}</div>`;
    }

    const itemsHtml = (order.order_items || []).map((it) => `
      <div class="flex-between" style="padding:var(--space-3) 0; border-bottom:1px solid var(--border-color);">
        <span>${it.quantity}× ${it.meal_name}</span>
        <strong>${formatNaira(it.line_total)}</strong>
      </div>`).join('');

    const payment = order.payments?.[0];

    contentEl.innerHTML = `
      <div class="flex-between" style="margin-bottom:var(--space-6); flex-wrap:wrap; gap:8px;">
        <div><h1>Order #${order.order_number}</h1><p class="text-muted">${new Date(order.created_at).toLocaleString('en-NG')}</p></div>
        <span class="badge badge-accent" style="font-size:var(--fs-sm);">${order.status.replace('_', ' ')}</span>
      </div>

      <div style="margin-bottom:var(--space-8);">${timelineHtml}</div>

      <div style="background:var(--surface-color); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:var(--space-5); margin-bottom:var(--space-5);">
        <h3>Items</h3>
        ${itemsHtml}
        <div class="flex-between" style="margin-top:var(--space-3);"><span class="text-muted">Subtotal</span><span>${formatNaira(order.subtotal)}</span></div>
        <div class="flex-between" style="margin-top:4px;"><span class="text-muted">Delivery fee</span><span>${formatNaira(order.delivery_fee)}</span></div>
        <div class="flex-between" style="margin-top:8px;"><strong>Total</strong><strong>${formatNaira(order.total)}</strong></div>
      </div>

      <div style="background:var(--surface-color); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:var(--space-5);">
        <h3>Details</h3>
        <dl style="display:grid; grid-template-columns: auto 1fr; gap:8px 16px; font-size:var(--fs-sm); margin-top:var(--space-3);">
          <dt class="text-muted">Order type</dt><dd>${order.order_type.replace('_', ' ')}</dd>
          ${order.delivery_address_text ? `<dt class="text-muted">Address</dt><dd>${order.delivery_address_text}</dd>` : ''}
          <dt class="text-muted">Contact</dt><dd>${order.customer_name}, ${order.customer_phone}</dd>
          <dt class="text-muted">Payment</dt><dd>${payment ? payment.payment_status : 'Not yet paid'}</dd>
          ${order.special_instructions ? `<dt class="text-muted">Notes</dt><dd>${order.special_instructions}</dd>` : ''}
        </dl>
      </div>

      ${order.status === 'completed' ? `<a href="reviews.html?order_id=${order.id}" class="btn btn-primary" style="margin-top:var(--space-6);">Leave a review</a>` : ''}
    `;
    AromaIcons.hydrateIcons(contentEl);
  } catch (err) {
    contentEl.innerHTML = emptyState({ icon: 'alertCircle', title: 'Could not load this order', message: friendlyError(err) });
  }
});
