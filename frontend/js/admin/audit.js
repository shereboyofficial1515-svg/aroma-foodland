window.AdminSections = window.AdminSections || {};
window.AdminSections.audit = {
  async render(panel) {
    const { logs } = await window.AromaApi.get('/admin/audit-logs?limit=100');
    panel.innerHTML = `
      <table class="admin-table">
        <thead><tr><th>When</th><th>User</th><th>Action</th><th>Resource</th></tr></thead>
        <tbody>${logs.map((l) => `
          <tr>
            <td>${new Date(l.created_at).toLocaleString('en-NG')}</td>
            <td>${l.profiles?.full_name || 'System'}</td>
            <td>${l.action.replace(/_/g, ' ')}</td>
            <td>${l.resource_type || '—'}${l.resource_id ? ` #${String(l.resource_id).slice(0, 8)}` : ''}</td>
          </tr>`).join('') || '<tr><td colspan="4">No audit logs yet</td></tr>'}</tbody>
      </table>`;
  },
};
