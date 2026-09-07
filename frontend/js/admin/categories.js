window.AdminSections = window.AdminSections || {};
window.AdminSections.categories = {
  async render(panel) {
    const { toast, friendlyError, confirmModal, formModal } = window.AromaUI;

    async function load() {
      const { categories } = await window.AromaApi.get('/categories');
      panel.innerHTML = `
        <div class="admin-toolbar"><span></span><button class="btn btn-primary" id="add-cat-btn"><i data-icon="plus" data-size="16"></i> Add Category</button></div>
        <table class="admin-table">
          <thead><tr><th>Name</th><th>Status</th><th>Order</th><th>Actions</th></tr></thead>
          <tbody>${categories.map((c) => `
            <tr>
              <td>${c.name}</td>
              <td>${c.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-neutral">Inactive</span>'}</td>
              <td>${c.display_order}</td>
              <td><button class="btn btn-ghost btn-sm" data-edit="${c.id}">Edit</button><button class="btn btn-ghost btn-sm" data-delete="${c.id}">Delete</button></td>
            </tr>`).join('') || '<tr><td colspan="4">No categories yet</td></tr>'}</tbody>
        </table>`;
      AromaIcons.hydrateIcons(panel);

      const fields = (c = {}) => `
        <div class="field"><label>Name</label><input name="name" value="${c.name || ''}" required /></div>
        <div class="field"><label>Description</label><textarea name="description">${c.description || ''}</textarea></div>
        <div class="field"><label>Display order</label><input name="display_order" type="number" value="${c.display_order ?? 0}" /></div>
        <label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" name="is_active" style="width:auto;" ${c.is_active !== false ? 'checked' : ''} /> Active</label>`;

      document.getElementById('add-cat-btn').addEventListener('click', async () => {
        const data = await formModal({ title: 'Add Category', fieldsHtml: fields(), submitLabel: 'Create' });
        if (!data) return;
        try { await window.AromaApi.post('/categories', { ...data, display_order: Number(data.display_order) }); toast('Category created.', 'success'); load(); }
        catch (err) { toast(friendlyError(err), 'error'); }
      });

      document.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', async () => {
        const cat = categories.find((c) => c.id === btn.getAttribute('data-edit'));
        const data = await formModal({ title: `Edit ${cat.name}`, fieldsHtml: fields(cat), submitLabel: 'Save' });
        if (!data) return;
        try { await window.AromaApi.patch(`/categories/${cat.id}`, { ...data, display_order: Number(data.display_order) }); toast('Category updated.', 'success'); load(); }
        catch (err) { toast(friendlyError(err), 'error'); }
      }));

      document.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', async () => {
        const ok = await confirmModal({ title: 'Delete category?', confirmLabel: 'Delete', danger: true });
        if (!ok) return;
        try { await window.AromaApi.delete(`/categories/${btn.getAttribute('data-delete')}`); toast('Category deleted.', 'success'); load(); }
        catch (err) { toast(friendlyError(err), 'error'); }
      }));
    }

    await load();
  },
};
