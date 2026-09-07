window.AdminSections = window.AdminSections || {};
window.AdminSections.meals = {
  async render(panel) {
    const { formatNaira } = window.AromaRender;
    const { toast, friendlyError, confirmModal, formModal } = window.AromaUI;

    async function load() {
      const [{ meals }, { categories }] = await Promise.all([
        window.AromaApi.get('/meals?limit=50'),
        window.AromaApi.get('/categories'),
      ]);

      panel.innerHTML = `
        <div class="admin-toolbar">
          <input type="search" id="meal-search" placeholder="Search meals…" style="max-width:280px;" />
          <button class="btn btn-primary" id="add-meal-btn"><i data-icon="plus" data-size="16"></i> Add Meal</button>
        </div>
        <table class="admin-table">
          <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody id="meals-tbody"></tbody>
        </table>`;
      AromaIcons.hydrateIcons(panel);

      function renderRows(list) {
        document.getElementById('meals-tbody').innerHTML = list.map((m) => `
          <tr>
            <td>${m.name}</td>
            <td>${m.meal_categories?.name || '—'}</td>
            <td>${formatNaira(m.discount_price || m.price)}</td>
            <td>${m.stock ?? '∞'}</td>
            <td>${m.availability ? '<span class="badge badge-success">Available</span>' : '<span class="badge badge-error">Disabled</span>'}</td>
            <td>
              <button class="btn btn-ghost btn-sm" data-edit="${m.id}">Edit</button>
              <button class="btn btn-ghost btn-sm" data-toggle="${m.id}" data-current="${m.availability}">${m.availability ? 'Disable' : 'Enable'}</button>
              <button class="btn btn-ghost btn-sm" data-delete="${m.id}">Delete</button>
            </td>
          </tr>`).join('') || '<tr><td colspan="6">No meals found</td></tr>';
        bindRowActions(list);
      }

      function fieldsForMeal(m = {}) {
        return `
          <div class="field"><label>Name</label><input name="name" value="${m.name || ''}" required /></div>
          <div class="field"><label>Description</label><textarea name="description">${m.description || ''}</textarea></div>
          <div class="grid grid-2">
            <div class="field"><label>Price (₦)</label><input name="price" type="number" min="0" value="${m.price || ''}" required /></div>
            <div class="field"><label>Discount price (₦, optional)</label><input name="discount_price" type="number" min="0" value="${m.discount_price || ''}" /></div>
          </div>
          <div class="grid grid-2">
            <div class="field"><label>Category</label><select name="category_id">${categories.map((c) => `<option value="${c.id}" ${m.category_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}</select></div>
            <div class="field"><label>Stock (blank = unlimited)</label><input name="stock" type="number" min="0" value="${m.stock ?? ''}" /></div>
          </div>
          <div class="grid grid-2">
            <label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" name="is_featured" style="width:auto;" ${m.is_featured ? 'checked' : ''} /> Featured</label>
            <label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" name="is_popular" style="width:auto;" ${m.is_popular ? 'checked' : ''} /> Popular</label>
          </div>`;
      }

      document.getElementById('add-meal-btn').addEventListener('click', async () => {
        const data = await formModal({ title: 'Add Meal', fieldsHtml: fieldsForMeal(), submitLabel: 'Create' });
        if (!data) return;
        try {
          await window.AromaApi.post('/meals', cleanPayload(data));
          toast('Meal created.', 'success');
          load();
        } catch (err) { toast(friendlyError(err), 'error'); }
      });

      function cleanPayload(data) {
        return {
          ...data,
          price: Number(data.price),
          discount_price: data.discount_price ? Number(data.discount_price) : null,
          stock: data.stock === '' ? null : Number(data.stock),
        };
      }

      function bindRowActions(list) {
        document.querySelectorAll('[data-edit]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const meal = list.find((x) => x.id === btn.getAttribute('data-edit'));
            const data = await formModal({ title: `Edit ${meal.name}`, fieldsHtml: fieldsForMeal(meal), submitLabel: 'Save' });
            if (!data) return;
            try {
              await window.AromaApi.patch(`/meals/${meal.id}`, cleanPayload(data));
              toast('Meal updated.', 'success');
              load();
            } catch (err) { toast(friendlyError(err), 'error'); }
          });
        });
        document.querySelectorAll('[data-toggle]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const current = btn.getAttribute('data-current') === 'true';
            try {
              await window.AromaApi.patch(`/meals/${btn.getAttribute('data-toggle')}`, { availability: !current });
              load();
            } catch (err) { toast(friendlyError(err), 'error'); }
          });
        });
        document.querySelectorAll('[data-delete]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const ok = await confirmModal({ title: 'Delete meal?', message: 'Meals with order history are disabled instead of deleted.', confirmLabel: 'Delete', danger: true });
            if (!ok) return;
            try {
              const res = await window.AromaApi.delete(`/meals/${btn.getAttribute('data-delete')}`);
              toast(res.message, 'success');
              load();
            } catch (err) { toast(friendlyError(err), 'error'); }
          });
        });
      }

      renderRows(meals);
      document.getElementById('meal-search').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        renderRows(meals.filter((m) => m.name.toLowerCase().includes(q)));
      });
    }

    await load();
  },
};
