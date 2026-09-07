const RES_STATUS_BADGE = {
  pending: 'badge-warning', confirmed: 'badge-accent', seated: 'badge-accent',
  completed: 'badge-success', cancelled: 'badge-error', no_show: 'badge-neutral',
};

document.addEventListener('DOMContentLoaded', async () => {
  const { toast, friendlyError, withButtonLoading, emptyState, confirmModal } = window.AromaUI;
  const dateInput = document.getElementById('reservation_date');
  const timeSelect = document.getElementById('reservation_time');
  const form = document.getElementById('reservation-form');
  const submitBtn = document.getElementById('reservation-submit');

  await window.AromaAuth.init();
  const user = window.AromaAuth.user;
  if (user) {
    document.getElementById('customer_name').value = user.full_name || '';
    document.getElementById('customer_phone').value = user.phone || '';
  }

  const today = new Date().toISOString().slice(0, 10);
  dateInput.min = today;
  dateInput.value = today;

  async function loadSlots() {
    timeSelect.innerHTML = '<option>Loading…</option>';
    try {
      const { slots } = await window.AromaApi.get(`/reservations/availability?date=${dateInput.value}`);
      const usable = slots.filter((s) => !s.is_full);
      timeSelect.innerHTML = slots.map((s) =>
        `<option value="${s.slot_time}" ${s.is_full ? 'disabled' : ''}>${s.slot_time}${s.is_full ? ' — fully booked' : ` (${s.remaining} left)`}</option>`
      ).join('') || '<option>No slots available</option>';
      if (!usable.length) toast('No available time slots for this date. Please choose another day.', 'error');
    } catch (err) {
      timeSelect.innerHTML = '<option>Could not load times</option>';
      toast(friendlyError(err), 'error');
    }
  }

  dateInput.addEventListener('change', loadSlots);
  loadSlots();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const run = withButtonLoading(submitBtn, async () => {
      try {
        await window.AromaApi.post('/reservations', {
          reservation_date: dateInput.value,
          reservation_time: timeSelect.value,
          guests: Number(document.getElementById('guests').value),
          customer_name: document.getElementById('customer_name').value.trim(),
          customer_phone: document.getElementById('customer_phone').value.trim(),
          customer_email: document.getElementById('customer_email').value.trim(),
          special_request: document.getElementById('special_request').value.trim() || null,
        });
        toast('Reservation received! We will confirm it shortly.', 'success');
        form.reset();
        dateInput.value = today;
        loadSlots();
        if (user) loadMyReservations();
      } catch (err) {
        toast(friendlyError(err), 'error');
      }
    });
    run();
  });

  async function loadMyReservations() {
    const listEl = document.getElementById('my-reservations');
    if (!user) {
      listEl.innerHTML = `<p class="text-muted">Sign in to see your reservation history.</p>`;
      return;
    }
    listEl.innerHTML = `<div class="skeleton" style="height:64px;margin-bottom:12px;"></div>`.repeat(2);
    try {
      const { reservations } = await window.AromaApi.get('/reservations');
      if (!reservations.length) {
        listEl.innerHTML = emptyState({ icon: 'calendar', title: 'No reservations yet', message: 'Book a table using the form above.' });
        return;
      }
      listEl.innerHTML = reservations.map((r) => `
        <div class="list-row">
          <div class="list-row-main">
            <strong>${r.reservation_date} at ${r.reservation_time}</strong>
            <div class="list-row-meta"><span>${r.guests} guest${r.guests === 1 ? '' : 's'}</span></div>
          </div>
          <div class="flex gap-2" style="align-items:center;">
            <span class="badge ${RES_STATUS_BADGE[r.status] || 'badge-neutral'}">${r.status.replace('_', ' ')}</span>
            ${['pending', 'confirmed'].includes(r.status) ? `<button class="btn btn-outline btn-sm" data-cancel="${r.id}">Cancel</button>` : ''}
          </div>
        </div>`).join('');

      listEl.querySelectorAll('[data-cancel]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const ok = await confirmModal({ title: 'Cancel reservation?', message: 'This cannot be undone.', confirmLabel: 'Cancel reservation', danger: true });
          if (!ok) return;
          try {
            await window.AromaApi.delete(`/reservations/${btn.getAttribute('data-cancel')}`);
            toast('Reservation cancelled.', 'success');
            loadMyReservations();
          } catch (err) { toast(friendlyError(err), 'error'); }
        });
      });
    } catch (err) {
      listEl.innerHTML = emptyState({ icon: 'alertCircle', title: 'Could not load reservations', message: friendlyError(err) });
    }
  }

  loadMyReservations();
});
