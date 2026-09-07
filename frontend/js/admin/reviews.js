window.AdminSections = window.AdminSections || {};
window.AdminSections.reviews = {
  async render(panel) {
    const { toast, friendlyError, confirmModal } = window.AromaUI;

    async function load() {
      const { reviews } = await window.AromaApi.get('/reviews?limit=50');
      panel.innerHTML = `
        <table class="admin-table">
          <thead><tr><th>Customer</th><th>Rating</th><th>Comment</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${reviews.map((r) => `
            <tr>
              <td>${r.profiles?.full_name || 'Guest'}</td>
              <td>${r.rating}★</td>
              <td>${(r.comment || '').slice(0, 80)}</td>
              <td>
                ${r.is_approved ? '<span class="badge badge-success">Approved</span>' : '<span class="badge badge-warning">Pending</span>'}
                ${r.is_hidden ? '<span class="badge badge-neutral">Hidden</span>' : ''}
                ${r.is_featured ? '<span class="badge badge-accent">Featured</span>' : ''}
              </td>
              <td>
                ${!r.is_approved ? `<button class="btn btn-ghost btn-sm" data-approve="${r.id}">Approve</button>` : ''}
                <button class="btn btn-ghost btn-sm" data-hide="${r.id}" data-current="${r.is_hidden}">${r.is_hidden ? 'Unhide' : 'Hide'}</button>
                <button class="btn btn-ghost btn-sm" data-feature="${r.id}" data-current="${r.is_featured}">${r.is_featured ? 'Unfeature' : 'Feature'}</button>
                <button class="btn btn-ghost btn-sm" data-delete="${r.id}">Delete</button>
              </td>
            </tr>`).join('') || '<tr><td colspan="5">No reviews yet</td></tr>'}</tbody>
        </table>`;

      panel.querySelectorAll('[data-approve]').forEach((btn) => btn.addEventListener('click', async () => {
        try { await window.AromaApi.patch(`/reviews/${btn.getAttribute('data-approve')}/moderate`, { is_approved: true }); load(); }
        catch (err) { toast(friendlyError(err), 'error'); }
      }));
      panel.querySelectorAll('[data-hide]').forEach((btn) => btn.addEventListener('click', async () => {
        const current = btn.getAttribute('data-current') === 'true';
        try { await window.AromaApi.patch(`/reviews/${btn.getAttribute('data-hide')}/moderate`, { is_hidden: !current }); load(); }
        catch (err) { toast(friendlyError(err), 'error'); }
      }));
      panel.querySelectorAll('[data-feature]').forEach((btn) => btn.addEventListener('click', async () => {
        const current = btn.getAttribute('data-current') === 'true';
        try { await window.AromaApi.patch(`/reviews/${btn.getAttribute('data-feature')}/moderate`, { is_featured: !current }); load(); }
        catch (err) { toast(friendlyError(err), 'error'); }
      }));
      panel.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', async () => {
        const ok = await confirmModal({ title: 'Delete review?', confirmLabel: 'Delete', danger: true });
        if (!ok) return;
        try { await window.AromaApi.delete(`/reviews/${btn.getAttribute('data-delete')}`); load(); }
        catch (err) { toast(friendlyError(err), 'error'); }
      }));
    }

    await load();
  },
};
