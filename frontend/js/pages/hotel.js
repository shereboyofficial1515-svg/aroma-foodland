document.addEventListener('DOMContentLoaded', async () => {
  const { toast, friendlyError, withButtonLoading } = window.AromaUI;
  const form = document.getElementById('hotel-form');
  const submitBtn = document.getElementById('hotel-submit');
  const checkIn = document.getElementById('check_in');
  const checkOut = document.getElementById('check_out');

  await window.AromaAuth.init();
  const user = window.AromaAuth.user;
  if (user) {
    document.getElementById('customer_name').value = user.full_name || '';
    document.getElementById('customer_phone').value = user.phone || '';
  }

  const today = new Date().toISOString().slice(0, 10);
  checkIn.min = today;
  checkIn.addEventListener('change', () => { checkOut.min = checkIn.value; });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (checkOut.value <= checkIn.value) {
      toast('Check-out must be after check-in.', 'error');
      return;
    }
    const run = withButtonLoading(submitBtn, async () => {
      try {
        await window.AromaApi.post('/bookings/hotel', {
          check_in: checkIn.value,
          check_out: checkOut.value,
          guests: Number(document.getElementById('guests').value),
          room_type: document.getElementById('room_type').value || null,
          additional_info: document.getElementById('additional_info').value.trim() || null,
          customer_name: document.getElementById('customer_name').value.trim(),
          customer_phone: document.getElementById('customer_phone').value.trim(),
          customer_email: document.getElementById('customer_email').value.trim(),
        });
        toast('Booking request received! Our team will confirm shortly.', 'success');
        form.reset();
      } catch (err) {
        toast(friendlyError(err), 'error');
      }
    });
    run();
  });
});
