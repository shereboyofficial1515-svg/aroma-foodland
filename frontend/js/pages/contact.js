document.addEventListener('DOMContentLoaded', () => {
  const { toast, friendlyError, withButtonLoading } = window.AromaUI;
  const form = document.getElementById('contact-form');
  const btn = document.getElementById('contact-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const run = withButtonLoading(btn, async () => {
      try {
        await window.AromaApi.post('/contact', {
          name: document.getElementById('name').value.trim(),
          email: document.getElementById('email').value.trim(),
          phone: document.getElementById('phone').value.trim() || null,
          subject: document.getElementById('subject').value.trim() || null,
          message: document.getElementById('message').value.trim(),
        });
        toast('Message sent — we will get back to you shortly.', 'success');
        form.reset();
      } catch (err) {
        toast(friendlyError(err), 'error');
      }
    });
    run();
  });
});
