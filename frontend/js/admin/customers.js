window.AdminSections = window.AdminSections || {};
window.AdminSections.customers = {
  async render(panel) {
    const { toast, friendlyError, confirmModal } = window.AromaUI;
    const currentUser = window.AromaAuth.user;
    const ROLES = ['customer', 'staff', 'manager', 'admin', 'super_admin'];

    async function load(search = '') {
      const { users } = await window.AromaApi.get(`/users${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      panel.innerHTML = `
        <div class="admin-toolbar"><input type="search" id="cust-search" placeholder="Search by name or phone…" style="max-width:280px;" value="${search}" /></div>
        <table class="admin-table">
          <thead><tr><th>Name</th><th>Phone</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${users.map((u) => `
            <tr>
              <td>${u.full_name}</td>
              <td>${u.phone || '—'}</td>
              <td>
                ${currentUser.role === 'admin' || currentUser.role === 'super_admin'
                  ? `<select data-role-select="${u.id}" ${u.id === currentUser.id ? 'disabled' : ''}>${ROLES.map((r) => `<option value="${r}" ${r === u.role ? 'selected' : ''}>${r.replace('_', ' ')}</option>`).join('')}</select>`
                  : u.role.replace('_', ' ')}
              </td>
              <td>${u.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-error">Disabled</span>'}</td>
              <td>${u.id === currentUser.id ? '<span class="text-muted">You</span>' : `<button class="btn btn-ghost btn-sm" data-toggle-status="${u.id}" data-current="${u.is_active}">${u.is_active ? 'Disable' : 'Enable'}</button>`}</td>
            </tr>`).join('') || '<tr><td colspan="5">No customers found</td></tr>'}</tbody>
        </table>`;

      document.getElementById('cust-search').addEventListener('input', (e) => {
        clearTimeout(window._custSearchTimer);
        window._custSearchTimer = setTimeout(() => load(e.target.value), 350);
      });

      document.querySelectorAll('[data-role-select]').forEach((sel) => {
        sel.addEventListener('change', async () => {
          try { await window.AromaApi.patch(`/users/${sel.getAttribute('data-role-select')}/role`, { role: sel.value }); toast('Role updated.', 'success'); }
          catch (err) { toast(friendlyError(err), 'error'); load(search); }
        });
      });

      document.querySelectorAll('[data-toggle-status]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const current = btn.getAttribute('data-current') === 'true';
          const ok = await confirmModal({ title: current ? 'Disable this account?' : 'Enable this account?', confirmLabel: current ? 'Disable' : 'Enable', danger: current });
          if (!ok) return;
          try { await window.AromaApi.patch(`/users/${btn.getAttribute('data-toggle-status')}/status`, { is_active: !current }); load(search); }
          catch (err) { toast(friendlyError(err), 'error'); }
        });
      });
    }

    await load();
  },
};
