// Aroma FoodLand — admin shell. Registers each section's render function in
// window.AdminSections (populated by js/admin/*.js, loaded before this file)
// and wires sidebar navigation to swap panels + call render on demand.

document.addEventListener('DOMContentLoaded', async () => {
  window.AdminSections = window.AdminSections || {};
  const guardMsg = document.getElementById('admin-guard-message');
  const appEl = document.getElementById('admin-app');

  await window.AromaAuth.init();
  const user = window.AromaAuth.user;
  const isStaff = user && ['staff', 'manager', 'admin', 'super_admin'].includes(user.role);

  if (!user) {
    guardMsg.innerHTML = `<h2>Please sign in</h2><p>Admin access requires a staff account.</p><a href="login.html?next=admin.html" class="btn btn-primary" style="margin-top:12px;">Sign in</a>`;
    return;
  }
  if (!isStaff) {
    guardMsg.innerHTML = `<h2>Access denied</h2><p>Your account doesn't have permission to view the admin dashboard.</p><a href="index.html" class="btn btn-primary" style="margin-top:12px;">Back to site</a>`;
    return;
  }

  guardMsg.hidden = true;
  appEl.hidden = false;
  AromaIcons.hydrateIcons(appEl);
  document.getElementById('admin-user-label').textContent = `${user.full_name} · ${user.role.replace('_', ' ')}`;

  const nav = document.getElementById('admin-nav');
  const titleEl = document.getElementById('admin-section-title');
  const SECTION_TITLES = {
    dashboard: 'Dashboard', orders: 'Orders', meals: 'Meals', categories: 'Categories',
    customers: 'Customers', reservations: 'Reservations', bookings: 'Catering & Hotel Bookings',
    reviews: 'Reviews', gallery: 'Gallery', promotions: 'Promotions', ai: 'AI Assistant',
    settings: 'Settings', audit: 'Audit Logs', messages: 'Contact Messages',
  };

  // Some sections are gated further by role (e.g. only managers can delete
  // categories) — the buttons inside each section's render() handle that;
  // this just controls which top-level tabs are visible at all.
  if (!['admin', 'super_admin'].includes(user.role)) {
    nav.querySelector('[data-section="audit"]').style.display = 'none';
    nav.querySelector('[data-section="settings"]').style.display = 'none';
  }

  async function activate(section) {
    nav.querySelectorAll('[data-section]').forEach((b) => b.classList.toggle('is-active', b.getAttribute('data-section') === section));
    document.querySelectorAll('.admin-section').forEach((p) => p.classList.toggle('is-active', p.getAttribute('data-panel') === section));
    titleEl.textContent = SECTION_TITLES[section] || section;

    const panel = document.getElementById(`panel-${section}`);
    const mod = window.AdminSections[section];
    if (mod?.render) {
      panel.innerHTML = `<div class="skeleton" style="height:200px;"></div>`;
      try { await mod.render(panel); } catch (err) { panel.innerHTML = window.AromaUI.emptyState({ icon: 'alertCircle', title: 'Could not load this section', message: window.AromaUI.friendlyError(err) }); }
    }
  }

  nav.querySelectorAll('[data-section]').forEach((btn) => {
    btn.addEventListener('click', () => activate(btn.getAttribute('data-section')));
  });
  document.getElementById('admin-logout').addEventListener('click', async () => {
    await window.AromaAuth.logout();
    window.location.href = 'index.html';
  });

  activate('dashboard');
});