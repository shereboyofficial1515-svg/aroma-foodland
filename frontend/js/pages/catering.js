const BOOKING_STATUS_BADGE = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-error', completed: 'badge-success', cancelled: 'badge-neutral' };

document.addEventListener('DOMContentLoaded', async () => {
  const { toast, friendlyError, withButtonLoading, emptyState } = window.AromaUI;
  const form = document.getElementById('catering-form');
  const submitBtn = document.getElementById('catering-submit');

  await window.AromaAuth.init();
  const user = window.AromaAuth.user;
  if (user) {
    document.getElementById('customer_name').value = user.full_name || '';
    document.getElementById('customer_phone').value = user.phone || '';
  }
  document.getElementById('event_date').min = new Date().toISOString().slice(0, 10);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const run = withButtonLoading(submitBtn, async () => {
      try {
        const services = document.getElementById('services_required').value.trim();
        await window.AromaApi.post('/catering', {
          event_type: document.getElementById('event_type').value,
          event_date: document.getElementById('event_date').value,
          guests: Number(document.getElementById('guests').value),
          budget: document.getElementById('budget').value ? Number(document.getElementById('budget').value) : null,
          location: document.getElementById('location').value.trim(),
          services_required: services || undefined,
          additional_info: document.getElementById('additional_info').value.trim() || null,
          customer_name: document.getElementById('customer_name').value.trim(),
          customer_phone: document.getElementById('customer_phone').value.trim(),
          customer_email: document.getElementById('customer_email').value.trim(),
        });
        toast('Request received! Our team will get back to you shortly.', 'success');
        form.reset();
        if (user) loadMine();
      } catch (err) {
        toast(friendlyError(err), 'error');
      }
    });
    run();
  });

  async function loadMine() {
    const listEl = document.getElementById('my-catering');
    if (!user) { listEl.innerHTML = `<p class="text-muted">Sign in to see your requests.</p>`; return; }
    listEl.innerHTML = `<div class="skeleton" style="height:64px;margin-bottom:12px;"></div>`.repeat(2);
    try {
      const { bookings } = await window.AromaApi.get('/catering');
      if (!bookings.length) { listEl.innerHTML = emptyState({ icon: 'party', title: 'No requests yet', message: 'Submit a request using the form above.' }); return; }
      listEl.innerHTML = bookings.map((b) => `
        <div class="list-row">
          <div class="list-row-main">
            <strong>${b.event_type.replace('_', ' ')} — ${b.event_date}</strong>
            <div class="list-row-meta"><span>${b.guests} guests</span><span>${b.location}</span></div>
          </div>
          <span class="badge ${BOOKING_STATUS_BADGE[b.status] || 'badge-neutral'}">${b.status}</span>
        </div>`).join('');
    } catch (err) {
      listEl.innerHTML = emptyState({ icon: 'alertCircle', title: 'Could not load requests', message: friendlyError(err) });
    }
  }
  loadMine();
});
