window.AdminSections = window.AdminSections || {};
window.AdminSections.orders = {
  async render(panel) {
    const { formatNaira } = window.AromaRender;
    const { toast, friendlyError } = window.AromaUI;
    const STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled', 'refunded'];

    async function load(status = '') {
      const { orders } = await window.AromaApi.get(`/orders${status ? `?status=${status}` : ''}`);
      panel.innerHTML = `
        <div class="admin-toolbar">
          <select id="status-filter">
            <option value="">All statuses</option>
            ${STATUSES.map((s) => `<option value="${s}" ${s === status ? 'selected' : ''}>${s.replace('_', ' ')}</option>`).join('')}
          </select>
        </div>
        <table class="admin-table">
          <thead><tr><th>Order</th><th>Customer</th><th>Type</th><th>Total</th><th>Status</th><th>Update</th></tr></thead>
          <tbody>${orders.map((o) => `
            <tr>
              <td>#${o.order_number}</td>
              <td>${o.customer_name}</td>
              <td>${o.order_type.replace('_', ' ')}</td>
              <td>${formatNaira(o.total)}</td>
              <td><span class="badge badge-accent">${o.status.replace('_', ' ')}</span></td>
              <td>
                <select data-status-select="${o.id}">${STATUSES.map((s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s.replace('_', ' ')}</option>`).join('')}</select>
              </td>
            </tr>`).join('') || '<tr><td colspan="6">No orders found</td></tr>'}</tbody>
        </table>`;

      document.getElementById('status-filter').addEventListener('change', (e) => load(e.target.value));
      document.querySelectorAll('[data-status-select]').forEach((sel) => {
        sel.addEventListener('change', async () => {
          try { await window.AromaApi.patch(`/orders/${sel.getAttribute('data-status-select')}/status`, { status: sel.value }); toast('Order status updated.', 'success'); load(status); }
          catch (err) { toast(friendlyError(err), 'error'); load(status); }
        });
      });
    }

    await load();
  },
};
