window.AdminSections = window.AdminSections || {};
window.AdminSections.promotions = {
  async render(panel) {
    const { toast, friendlyError, formModal, confirmModal } = window.AromaUI;

    async function load() {
      const { promotions } = await window.AromaApi.get('/promotions');
      panel.innerHTML = `
        <div class="admin-toolbar"><span></span><button class="btn btn-primary" id="add-promo-btn"><i data-icon="plus" data-size="16"></i> New Announcement</button></div>
        <table class="admin-table">
          <thead><tr><th>Title</th><th>Audience</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>${promotions.map((p) => `
            <tr>
              <td>${p.title}</td>
              <td>${p.target_audience}</td>
              <td>${p.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-neutral">Inactive</span>'}</td>
              <td><button class="btn btn-ghost btn-sm" data-delete="${p.id}">Delete</button></td>
            </tr>`).join('') || '<tr><td colspan="4">No promotions yet</td></tr>'}</tbody>
        </table>`;
      AromaIcons.hydrateIcons(panel);

      document.getElementById('add-promo-btn').addEventListener('click', async () => {
        const data = await formModal({
          title: 'New Announcement',
          fieldsHtml: `
            <div class="field"><label>Title</label><input name="title" required /></div>
            <div class="field"><label>Message</label><textarea name="message" required></textarea></div>
            <div class="field"><label>Audience</label><select name="target_audience"><option value="all">Everyone</option><option value="customers">Customers</option><option value="staff">Staff</option></select></div>
            <label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" name="broadcast" style="width:auto;" checked /> Send as notification immediately</label>`,
          submitLabel: 'Publish',
        });
        if (!data) return;
        try { await window.AromaApi.post('/promotions', { ...data, is_active: true }); toast('Promotion published.', 'success'); load(); }
        catch (err) { toast(friendlyError(err), 'error'); }
      });

      panel.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', async () => {
        const ok = await confirmModal({ title: 'Delete promotion?', confirmLabel: 'Delete', danger: true });
        if (!ok) return;
        try { await window.AromaApi.delete(`/promotions/${btn.getAttribute('data-delete')}`); load(); }
        catch (err) { toast(friendlyError(err), 'error'); }
      }));
    }

    await load();
  },
};
