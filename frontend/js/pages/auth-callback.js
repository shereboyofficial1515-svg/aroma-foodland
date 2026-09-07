document.addEventListener('DOMContentLoaded', async () => {
  const contentEl = document.getElementById('callback-content');
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');

  if (!accessToken || !refreshToken) {
    contentEl.innerHTML = `<h1>This link is invalid or expired</h1><p class="lede" style="margin:12px auto;">Please try signing in again.</p><a href="login.html" class="btn btn-primary" style="margin-top:16px;">Back to sign in</a>`;
    return;
  }

  try {
    await window.AromaApi.post('/auth/session', { access_token: accessToken, refresh_token: refreshToken });
    await window.AromaAuth.init();
    contentEl.innerHTML = `<h1>You're all set!</h1><p class="lede" style="margin:12px auto;">Redirecting…</p>`;
    setTimeout(() => { window.location.href = 'account.html'; }, 900);
  } catch (err) {
    contentEl.innerHTML = `<h1>Something went wrong</h1><p class="lede" style="margin:12px auto;">${window.AromaUI.friendlyError(err)}</p><a href="login.html" class="btn btn-primary" style="margin-top:16px;">Back to sign in</a>`;
  }
});
