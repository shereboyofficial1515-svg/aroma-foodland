window.AdminSections = window.AdminSections || {};
window.AdminSections.bookings = {
  async render(panel) {
    const { toast, friendlyError, formModal } = window.AromaUI;
    const STATUSES = ['pending', 'approved', 'rejected', 'completed', 'cancelled'];
    let activeTab = 'catering';

    async function load() {
      const endpoint = activeTab === 'catering' ? '/catering' : '/bookings/hotel';
      const { bookings } = await window.AromaApi.get(endpoint);

      panel.innerHTML = `
        <div class="admin-toolbar">
          <div class="flex gap-2">
            <button class="btn ${activeTab === 'catering' ? 'btn-primary' : 'btn-outline'} btn-sm" data-tab="catering">Catering / Events</button>
            <button class="btn ${activeTab === 'hotel' ? 'btn-primary' : 'btn-outline'} btn-sm" data-tab="hotel">Hotel</button>
          </div>
        </div>
        <table class="admin-table">
          <thead><tr><th>Customer</th>${activeTab === 'catering' ? '<th>Event</th><th>Date</th><th>Location</th>' : '<th>Check-in</th><th>Check-out</th><th>Room</th>'}<th>Status</th><th>Actions</th></tr></thead>
          <tbody>${bookings.map((b) => `
            <tr>
              <td>${b.customer_name}<br/><span class="text-muted" style="font-size:var(--fs-xs);">${b.customer_phone}</span></td>
              ${activeTab === 'catering'
                ? `<td>${b.event_type.replace('_', ' ')}</td><td>${b.event_date}</td><td>${b.location}</td>`
                : `<td>${b.check_in}</td><td>${b.check_out}</td><td>${b.room_type || 'Any'}</td>`}
              <td><span class="badge badge-accent">${b.status}</span></td>
              <td>
                <select data-booking-status="${b.id}">${STATUSES.map((s) => `<option value="${s}" ${s === b.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
              </td>
            </tr>`).join('') || `<tr><td colspan="5">No ${activeTab} requests found</td></tr>`}</tbody>
        </table>`;

      panel.querySelectorAll('[data-tab]').forEach((btn) => btn.addEventListener('click', () => { activeTab = btn.getAttribute('data-tab'); load(); }));
      panel.querySelectorAll('[data-booking-status]').forEach((sel) => {
        sel.addEventListener('change', async () => {
          const endpoint2 = activeTab === 'catering' ? `/catering/${sel.getAttribute('data-booking-status')}/status` : `/bookings/hotel/${sel.getAttribute('data-booking-status')}/status`;
          try {
            const notes = prompt('Optional note to include in the customer email:') || undefined;
            await window.AromaApi.patch(endpoint2, { status: sel.value, admin_notes: notes });
            toast('Booking updated.', 'success');
            load();
          } catch (err) { toast(friendlyError(err), 'error'); load(); }
        });
      });
    }

    await load();
  },
};
