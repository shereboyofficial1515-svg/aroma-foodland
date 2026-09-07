document.addEventListener('DOMContentLoaded', async () => {
  const { toast, friendlyError, withButtonLoading } = window.AromaUI;
  const form = document.getElementById('login-form');
  const submitBtn = document.getElementById('login-submit');
  const toggleBtn = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('password');

  await window.AromaAuth.init();
  const next = new URLSearchParams(window.location.search).get('next');
  if (window.AromaAuth.user) { window.location.href = next ? decodeURIComponent(next) : 'account.html'; return; }

  toggleBtn.addEventListener('click', () => {
    const show = passwordInput.type === 'password';
    passwordInput.type = show ? 'text' : 'password';
    toggleBtn.innerHTML = AromaIcons.icon(show ? 'eyeOff' : 'eye', { size: 18 });
    toggleBtn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = passwordInput.value;
    const run = withButtonLoading(submitBtn, async () => {
      try {
        await window.AromaAuth.login(email, password);
        toast('Welcome back!', 'success');
        window.location.href = next ? decodeURIComponent(next) : 'account.html';
      } catch (err) {
        toast(friendlyError(err), 'error');
      }
    });
    run();
  });

  document.getElementById('google-btn').addEventListener('click', async () => {
    try {
      const { url } = await window.AromaApi.get('/auth/google');
      window.location.href = url;
    } catch (err) {
      toast(friendlyError(err), 'error');
    }
  });
});
