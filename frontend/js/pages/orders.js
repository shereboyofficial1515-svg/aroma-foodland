const STATUS_BADGE = {
  pending: 'badge-warning', confirmed: 'badge-accent', preparing: 'badge-accent',
  ready: 'badge-accent', out_for_delivery: 'badge-accent', completed: 'badge-success',
  cancelled: 'badge-error', refunded: 'badge-neutral',
};

document.addEventListener('DOMContentLoaded', async () => {
  const { formatNaira } = window.AromaRender;
  const { emptyState, friendlyError } = window.AromaUI;
  const listEl = document.getElementById('orders-list');

  await window.AromaAuth.init();
  if (!window.AromaAuth.requireLogin()) return;

  listEl.innerHTML = `<div class="skeleton" style="height:80px;margin-bottom:12px;"></div>`.repeat(3);

  try {
    const { orders } = await window.AromaApi.get('/orders');
    if (!orders.length) {
      listEl.innerHTML = emptyState({ icon: 'orders', title: 'No orders found', message: 'When you place an order, it will show up here.' }) +
        `<a href="menu.html" class="btn btn-primary" style="display:block;width:fit-content;margin:0 auto;">Browse the menu</a>`;
      return;
    }

    listEl.innerHTML = orders.map((o) => `
      <a href="order-details.html?id=${o.id}" class="list-row">
        <div class="list-row-main">
          <strong>#${o.order_number}</strong>
          <div class="list-row-meta">
            <span>${new Date(o.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <span>${formatNaira(o.total)}</span>
            <span>${o.order_type.replace('_', ' ')}</span>
          </div>
        </div>
        <span class="badge ${STATUS_BADGE[o.status] || 'badge-neutral'}">${o.status.replace('_', ' ')}</span>
      </a>`).join('');
    AromaIcons.hydrateIcons(listEl);
  } catch (err) {
    listEl.innerHTML = emptyState({ icon: 'alertCircle', title: 'Could not load your orders', message: friendlyError(err) });
  }
});
