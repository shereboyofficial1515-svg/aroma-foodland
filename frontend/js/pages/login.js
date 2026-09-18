document.addEventListener('DOMContentLoaded', async () => {
  const { toast, friendlyError, withButtonLoading, noticePanelHtml, startResendCooldown } = window.AromaUI;
  const form = document.getElementById('login-form');
  const submitBtn = document.getElementById('login-submit');
  const toggleBtn = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('password');
  const noticeEl = document.getElementById('login-notice');

  await window.AromaAuth.init();
  const next = new URLSearchParams(window.location.search).get('next');
  if (window.AromaAuth.user) { window.location.href = next ? decodeURIComponent(next) : 'account.html'; return; }

  toggleBtn.addEventListener('click', () => {
    const show = passwordInput.type === 'password';
    passwordInput.type = show ? 'text' : 'password';
    toggleBtn.innerHTML = AromaIcons.icon(show ? 'eyeOff' : 'eye', { size: 18 });
    toggleBtn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  function showNotice(html) {
    noticeEl.innerHTML = html;
    noticeEl.style.display = 'block';
  }
  function hideNotice() {
    noticeEl.style.display = 'none';
    noticeEl.innerHTML = '';
  }

  async function resendVerification(email) {
    const btn = document.getElementById('resend-verification-btn');
    if (btn) btn.disabled = true;
    try {
      await window.AromaApi.post('/auth/resend-verification', { email });
      toast('Verification email sent — check your inbox.', 'success');
      if (btn) startResendCooldown(btn, 60);
    } catch (err) {
      if (btn) btn.disabled = false;
      toast(friendlyError(err), 'error');
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideNotice();
    const email = document.getElementById('email').value.trim();
    const password = passwordInput.value;
    const run = withButtonLoading(submitBtn, async () => {
      try {
        await window.AromaAuth.login(email, password);
        toast('Welcome back!', 'success');
        window.location.href = next ? decodeURIComponent(next) : 'account.html';
      } catch (err) {
        if (err.code === 'EMAIL_NOT_VERIFIED') {
          showNotice(noticePanelHtml({
            type: 'warning',
            title: 'Email verification required',
            message: "Your email address hasn't been verified yet. Please check your inbox and click the verification link before signing in.",
            actionId: 'resend-verification-btn',
            actionLabel: 'Resend verification email',
          }));
          document.getElementById('resend-verification-btn').addEventListener('click', () => resendVerification(email));
        } else if (err.code === 'EMAIL_RATE_LIMITED') {
          showNotice(noticePanelHtml({
            type: 'error',
            title: 'Too many attempts',
            message: err.message,
          }));
        } else {
          toast(friendlyError(err), 'error');
        }
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