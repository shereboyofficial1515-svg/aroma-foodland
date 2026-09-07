document.addEventListener('DOMContentLoaded', async () => {
  const { toast, friendlyError, withButtonLoading, confirmModal, emptyState } = window.AromaUI;

  await window.AromaAuth.init();
  if (!window.AromaAuth.requireLogin()) return;
  const user = window.AromaAuth.user;

  // --- Tabs ---
  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-tab]').forEach((b) => b.classList.remove('is-active'));
      document.querySelectorAll('[data-panel]').forEach((p) => p.classList.remove('is-active'));
      btn.classList.add('is-active');
      document.querySelector(`[data-panel="${btn.getAttribute('data-tab')}"]`).classList.add('is-active');
    });
  });

  // --- Profile ---
  document.getElementById('full_name').value = user.full_name || '';
  document.getElementById('phone').value = user.phone || '';
  const profileForm = document.getElementById('profile-form');
  const profileBtn = document.getElementById('profile-submit');
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const run = withButtonLoading(profileBtn, async () => {
      try {
        await window.AromaApi.patch('/users/me', {
          full_name: document.getElementById('full_name').value.trim(),
          phone: document.getElementById('phone').value.trim(),
        });
        toast('Profile updated.', 'success');
      } catch (err) { toast(friendlyError(err), 'error'); }
    });
    run();
  });

  // --- Notification preferences ---
  document.getElementById('pref_email').checked = user.notification_prefs?.email !== false;
  document.getElementById('pref_push').checked = user.notification_prefs?.push !== false;
  document.getElementById('pref_promotions').checked = user.notification_prefs?.promotions !== false;
  const prefsForm = document.getElementById('prefs-form');
  const prefsBtn = document.getElementById('prefs-submit');
  prefsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const run = withButtonLoading(prefsBtn, async () => {
      try {
        await window.AromaApi.patch('/users/me', {
          notification_prefs: {
            email: document.getElementById('pref_email').checked,
            push: document.getElementById('pref_push').checked,
            promotions: document.getElementById('pref_promotions').checked,
          },
        });
        toast('Preferences saved.', 'success');
      } catch (err) { toast(friendlyError(err), 'error'); }
    });
    run();
  });

  // --- Password ---
  const passwordForm = document.getElementById('password-form');
  const passwordBtn = document.getElementById('password-submit');
  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const run = withButtonLoading(passwordBtn, async () => {
      try {
        await window.AromaApi.post('/auth/change-password', {
          current_password: document.getElementById('current_password').value,
          new_password: document.getElementById('new_password').value,
        });
        toast('Password updated.', 'success');
        passwordForm.reset();
      } catch (err) { toast(friendlyError(err), 'error'); }
    });
    run();
  });

  // --- Addresses ---
  const addressesList = document.getElementById('addresses-list');
  const addressForm = document.getElementById('address-form');
  const addressBtn = document.getElementById('address-submit');

  async function loadAddresses() {
    addressesList.innerHTML = `<div class="skeleton" style="height:56px;margin-bottom:8px;"></div>`;
    try {
      const { addresses } = await window.AromaApi.get('/addresses');
      if (!addresses.length) { addressesList.innerHTML = emptyState({ icon: 'mapPin', title: 'No saved addresses', message: 'Add one below for faster checkout.' }); return; }
      addressesList.innerHTML = addresses.map((a) => `
        <div class="list-row">
          <div class="list-row-main">
            <strong>${a.label || 'Address'} ${a.is_default ? '<span class="badge badge-accent">Default</span>' : ''}</strong>
            <span class="text-muted" style="font-size:var(--fs-sm);">${a.street}, ${a.city}, ${a.state}${a.landmark ? ` (${a.landmark})` : ''}</span>
          </div>
          <button class="icon-btn" aria-label="Delete address" data-del-addr="${a.id}">${AromaIcons.icon('trash', { size: 16 })}</button>
        </div>`).join('');
      addressesList.querySelectorAll('[data-del-addr]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const ok = await confirmModal({ title: 'Remove address?', confirmLabel: 'Remove', danger: true });
          if (!ok) return;
          try { await window.AromaApi.delete(`/addresses/${btn.getAttribute('data-del-addr')}`); loadAddresses(); }
          catch (err) { toast(friendlyError(err), 'error'); }
        });
      });
    } catch (err) {
      addressesList.innerHTML = emptyState({ icon: 'alertCircle', title: 'Could not load addresses', message: friendlyError(err) });
    }
  }

  addressForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const run = withButtonLoading(addressBtn, async () => {
      try {
        await window.AromaApi.post('/addresses', {
          label: document.getElementById('addr_label').value.trim() || 'Home',
          street: document.getElementById('addr_street').value.trim(),
          city: document.getElementById('addr_city').value.trim(),
          state: document.getElementById('addr_state').value.trim() || 'Delta State',
          landmark: document.getElementById('addr_landmark').value.trim() || null,
          is_default: document.getElementById('addr_default').checked,
        });
        toast('Address saved.', 'success');
        addressForm.reset();
        document.getElementById('addr_state').value = 'Delta State';
        loadAddresses();
      } catch (err) { toast(friendlyError(err), 'error'); }
    });
    run();
  });

  loadAddresses();

  // --- Logout ---
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await window.AromaAuth.logout();
    window.location.href = 'index.html';
  });
});
