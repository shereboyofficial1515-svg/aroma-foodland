window.AdminSections = window.AdminSections || {};
window.AdminSections.reservations = {
  async render(panel) {
    const { toast, friendlyError } = window.AromaUI;
    const STATUSES = ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'];

    async function load(status = '') {
      const { reservations } = await window.AromaApi.get(`/reservations${status ? `?status=${status}` : ''}`);
      panel.innerHTML = `
        <div class="admin-toolbar">
          <select id="res-status-filter"><option value="">All statuses</option>${STATUSES.map((s) => `<option value="${s}" ${s === status ? 'selected' : ''}>${s.replace('_', ' ')}</option>`).join('')}</select>
          <button class="btn btn-outline btn-sm" id="send-reminders-btn">Send today's reminders</button>
        </div>
        <table class="admin-table">
          <thead><tr><th>Customer</th><th>Date</th><th>Time</th><th>Guests</th><th>Status</th><th>Update</th></tr></thead>
          <tbody>${reservations.map((r) => `
            <tr>
              <td>${r.customer_name}<br/><span class="text-muted" style="font-size:var(--fs-xs);">${r.customer_phone}</span></td>
              <td>${r.reservation_date}</td>
              <td>${r.reservation_time}</td>
              <td>${r.guests}</td>
              <td><span class="badge badge-accent">${r.status.replace('_', ' ')}</span></td>
              <td><select data-res-status="${r.id}">${STATUSES.map((s) => `<option value="${s}" ${s === r.status ? 'selected' : ''}>${s.replace('_', ' ')}</option>`).join('')}</select></td>
            </tr>`).join('') || '<tr><td colspan="6">No reservations found</td></tr>'}</tbody>
        </table>`;

      document.getElementById('res-status-filter').addEventListener('change', (e) => load(e.target.value));
      document.getElementById('send-reminders-btn').addEventListener('click', async (e) => {
        const btn = e.target;
        const run = window.AromaUI.withButtonLoading(btn, async () => {
          try { const res = await window.AromaApi.post('/reservations/admin/send-reminders'); toast(res.message, 'success'); }
          catch (err) { toast(friendlyError(err), 'error'); }
        });
        run();
      });
      document.querySelectorAll('[data-res-status]').forEach((sel) => {
        sel.addEventListener('change', async () => {
          try { await window.AromaApi.patch(`/reservations/${sel.getAttribute('data-res-status')}/status`, { status: sel.value }); toast('Reservation updated.', 'success'); load(status); }
          catch (err) { toast(friendlyError(err), 'error'); load(status); }
        });
      });
    }

    await load();
  },
};
