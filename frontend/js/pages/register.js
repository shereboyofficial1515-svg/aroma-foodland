document.addEventListener('DOMContentLoaded', async () => {
  const { toast, friendlyError, withButtonLoading } = window.AromaUI;
  const form = document.getElementById('register-form');
  const submitBtn = document.getElementById('register-submit');

  await window.AromaAuth.init();
  if (window.AromaAuth.user) { window.location.href = 'account.html'; return; }

  const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  function setError(id, condition) {
    document.getElementById(id).closest('.field')?.classList.toggle('has-error', condition);
  }

  function validate() {
    const fullName = document.getElementById('full_name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirm_password').value;

    const errors = {
      full_name: fullName.length < 2,
      phone: !/^(\+?234|0)[789][01]\d{8}$/.test(phone),
      email: !/^\S+@\S+\.\S+$/.test(email),
      password: !PASSWORD_RE.test(password),
      confirm_password: password !== confirm,
    };
    Object.entries(errors).forEach(([id, hasError]) => setError(id, hasError));
    return !Object.values(errors).some(Boolean);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) { toast('Please fix the highlighted fields.', 'error'); return; }

    const run = withButtonLoading(submitBtn, async () => {
      try {
        const result = await window.AromaAuth.register({
          full_name: document.getElementById('full_name').value.trim(),
          phone: document.getElementById('phone').value.trim(),
          email: document.getElementById('email').value.trim(),
          password: document.getElementById('password').value,
          confirm_password: document.getElementById('confirm_password').value,
        });

        if (result.requiresEmailVerification) {
          document.querySelector('.auth-shell').innerHTML = `
            <div class="text-center">
              <h1>Check your email</h1>
              <p class="lede" style="margin:12px auto;">We've sent a verification link to your email address. Click it to activate your account, then sign in.</p>
              <a href="login.html" class="btn btn-primary" style="margin-top:16px;">Go to sign in</a>
            </div>`;
        } else {
          toast('Account created!', 'success');
          window.location.href = 'account.html';
        }
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
