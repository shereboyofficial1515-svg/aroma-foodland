window.AdminSections = window.AdminSections || {};
window.AdminSections.meals = {
  async render(panel) {
    const { formatNaira } = window.AromaRender;
    const { toast, friendlyError, confirmModal, formModal } = window.AromaUI;

    const MAX_BYTES = 5 * 1024 * 1024;
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    const state = { search: '', category: '', availability: '', page: 1, limit: 20 };
    let categories = [];

    function availabilityStateOf(m) {
      if (m.availability === false) return 'unavailable';
      if (m.stock === 0) return 'out_of_stock';
      return 'available';
    }

    function availabilityBadge(m) {
      const s = availabilityStateOf(m);
      if (s === 'unavailable') return '<span class="badge badge-error">Unavailable</span>';
      if (s === 'out_of_stock') return '<span class="badge badge-warning">Out of stock</span>';
      return '<span class="badge badge-success">Available</span>';
    }

    function tagBadges(m) {
      const tags = [];
      if (m.is_featured) tags.push('<span class="badge badge-accent">Featured</span>');
      if (m.is_popular) tags.push('<span class="badge badge-accent">Popular</span>');
      if (m.is_new) tags.push('<span class="badge badge-success">New</span>');
      if (m.is_recommended) tags.push('<span class="badge badge-neutral">Recommended</span>');
      return tags.join(' ') || '<span class="text-muted">—</span>';
    }

    // --- Image dropzone: wires drag/drop + click-to-choose + validation +
    // preview on whichever modal was just opened. Must be called BEFORE
    // awaiting formModal()'s promise, since the backdrop is already in the
    // DOM synchronously the moment formModal() is invoked.
    function wireDropzone() {
      const backdrops = document.querySelectorAll('.modal-backdrop');
      const backdrop = backdrops[backdrops.length - 1];
      const dropzone = backdrop.querySelector('#meal-dropzone');
      const input = backdrop.querySelector('#meal-image-input');
      const errorEl = backdrop.querySelector('#dropzone-error');
      let removedExisting = false;

      function clearPreview() {
        const existingPreview = dropzone.querySelector('.dropzone-preview');
        if (existingPreview) existingPreview.remove();
        const prompt = dropzone.querySelector('#dropzone-prompt');
        if (prompt) prompt.style.display = '';
      }

      function showPreview(url) {
        clearPreview();
        const prompt = dropzone.querySelector('#dropzone-prompt');
        if (prompt) prompt.style.display = 'none';
        dropzone.insertAdjacentHTML('afterbegin', `
          <div class="dropzone-preview">
            <img src="${url}" alt="" />
            <button type="button" class="btn btn-sm btn-outline dropzone-remove" data-dz-clear="1">Change / remove</button>
          </div>`);
      }

      function handleFile(file) {
        errorEl.textContent = '';
        if (!file) return;
        if (!ALLOWED_TYPES.includes(file.type)) {
          errorEl.textContent = 'Only JPG, PNG or WEBP images are allowed.';
          input.value = '';
          return;
        }
        if (file.size > MAX_BYTES) {
          errorEl.textContent = 'Image must be smaller than 5MB.';
          input.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = () => showPreview(reader.result);
        reader.readAsDataURL(file);
      }

      input.addEventListener('change', () => handleFile(input.files[0]));

      dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('is-dragover'); });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragover'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('is-dragover');
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (!file) return;
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        handleFile(file);
      });

      dropzone.addEventListener('click', (e) => {
        if (e.target.closest('[data-dz-clear]')) {
          e.preventDefault();
          e.stopPropagation();
          input.value = '';
          errorEl.textContent = '';
          removedExisting = true;
          clearPreview();
        }
      });

      return () => removedExisting;
    }

    function fieldsForMeal(m = {}) {
      const availState = availabilityStateOf(m);
      const hasImage = Boolean(m.primary_image_url);
      return `
        <div class="field">
          <label>Food photo</label>
          <div class="dropzone" id="meal-dropzone">
            ${hasImage ? `
              <div class="dropzone-preview">
                <img src="${m.primary_image_url}" alt="" />
                <button type="button" class="btn btn-sm btn-outline dropzone-remove" data-dz-clear="1">Change / remove</button>
              </div>` : ''}
            <div id="dropzone-prompt" style="${hasImage ? 'display:none;' : ''}">
              <i data-icon="upload" data-size="28" class="icon"></i>
              <div>Drag &amp; drop a photo, or <strong>choose an image</strong></div>
              <div class="dropzone-hint">JPG, PNG or WEBP, up to 5MB</div>
            </div>
            <input type="file" name="image" accept="image/jpeg,image/png,image/webp" id="meal-image-input" />
          </div>
          <div class="dropzone-error" id="dropzone-error"></div>
        </div>
        <div class="field"><label>Name</label><input name="name" value="${m.name || ''}" required /></div>
        <div class="field"><label>Description</label><textarea name="description">${m.description || ''}</textarea></div>
        <div class="grid grid-2">
          <div class="field"><label>Price (₦)</label><input name="price" type="number" min="0" value="${m.price || ''}" required /></div>
          <div class="field"><label>Discount price (₦, optional)</label><input name="discount_price" type="number" min="0" value="${m.discount_price || ''}" /></div>
        </div>
        <div class="grid grid-2">
          <div class="field"><label>Category</label><select name="category_id">${categories.map((c) => `<option value="${c.id}" ${m.category_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}</select></div>
          <div class="field"><label>Preparation time (minutes)</label><input name="preparation_time_minutes" type="number" min="0" value="${m.preparation_time_minutes ?? 20}" /></div>
        </div>
        <div class="grid grid-2">
          <div class="field"><label>Availability</label>
            <select name="availability_state">
              <option value="available" ${availState === 'available' ? 'selected' : ''}>Available</option>
              <option value="out_of_stock" ${availState === 'out_of_stock' ? 'selected' : ''}>Out of stock</option>
              <option value="unavailable" ${availState === 'unavailable' ? 'selected' : ''}>Unavailable</option>
            </select>
          </div>
          <div class="field"><label>Stock quantity (blank = unlimited)</label><input name="stock" type="number" min="0" value="${m.stock ?? ''}" /></div>
        </div>
        <div class="grid grid-2">
          <div class="field"><label>Ingredients (comma-separated)</label><input name="ingredients" value="${(m.ingredients || []).join(', ')}" placeholder="e.g. rice, tomato, chicken" /></div>
          <div class="field"><label>Allergens (comma-separated)</label><input name="allergens" value="${(m.allergens || []).join(', ')}" placeholder="e.g. peanuts, dairy" /></div>
        </div>
        <div class="grid grid-2">
          <div class="field"><label>Spice level</label>
            <select name="spice_level">
              <option value="0" ${!m.spice_level ? 'selected' : ''}>None</option>
              <option value="1" ${m.spice_level === 1 ? 'selected' : ''}>Mild</option>
              <option value="2" ${m.spice_level === 2 ? 'selected' : ''}>Medium</option>
              <option value="3" ${m.spice_level === 3 ? 'selected' : ''}>Hot</option>
            </select>
          </div>
          <div class="field"><label>Portion info (optional)</label><input name="portion_info" value="${m.portion_info || ''}" placeholder="e.g. Serves 1-2" /></div>
        </div>
        <div class="grid grid-2">
          <label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" name="is_featured" style="width:auto;" ${m.is_featured ? 'checked' : ''} /> Featured</label>
          <label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" name="is_popular" style="width:auto;" ${m.is_popular ? 'checked' : ''} /> Popular</label>
        </div>
        <div class="grid grid-2">
          <label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" name="is_new" style="width:auto;" ${m.is_new ? 'checked' : ''} /> New</label>
          <label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" name="is_recommended" style="width:auto;" ${m.is_recommended ? 'checked' : ''} /> Recommended</label>
        </div>`;
    }

    function cleanPayload(data) {
      const availState = data.availability_state;
      delete data.availability_state;
      delete data.image;

      const payload = {
        ...data,
        price: Number(data.price),
        discount_price: data.discount_price ? Number(data.discount_price) : null,
        preparation_time_minutes: data.preparation_time_minutes ? Number(data.preparation_time_minutes) : undefined,
        spice_level: data.spice_level !== '' ? Number(data.spice_level) : 0,
        stock: data.stock === '' ? null : Number(data.stock),
      };

      if (availState === 'unavailable') {
        payload.availability = false;
      } else if (availState === 'out_of_stock') {
        payload.availability = true;
        payload.stock = 0;
      } else {
        payload.availability = true;
        if (payload.stock === 0) payload.stock = null;
      }

      return payload;
    }

    async function uploadMealPhoto(mealId, file, { replace }) {
      const fd = new FormData();
      fd.append('images', file);
      await window.AromaApi.upload(`/meals/${mealId}/images${replace ? '?replace=true' : ''}`, fd);
    }

    async function load() {
      const qs = new URLSearchParams();
      if (state.search) qs.set('search', state.search);
      if (state.category) qs.set('category', state.category);
      if (state.availability) qs.set('availability', state.availability);
      qs.set('page', state.page);
      qs.set('limit', state.limit);

      const [{ meals, pagination }, catRes] = await Promise.all([
        window.AromaApi.get(`/meals?${qs.toString()}`),
        categories.length ? Promise.resolve({ categories }) : window.AromaApi.get('/categories'),
      ]);
      categories = catRes.categories;

      panel.innerHTML = `
        <div class="admin-toolbar">
          <input type="search" id="meal-search" placeholder="Search meals…" style="max-width:220px;" value="${state.search}" />
          <select id="meal-cat-filter">
            <option value="">All categories</option>
            ${categories.map((c) => `<option value="${c.slug}" ${state.category === c.slug ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
          <select id="meal-avail-filter">
            <option value="">All availability</option>
            <option value="true" ${state.availability === 'true' ? 'selected' : ''}>Available</option>
            <option value="false" ${state.availability === 'false' ? 'selected' : ''}>Unavailable</option>
          </select>
          <button class="btn btn-primary" id="add-meal-btn"><i data-icon="plus" data-size="16"></i> Add Meal</button>
        </div>
        <table class="admin-table">
          <thead><tr><th>Photo</th><th>Name</th><th>Category</th><th>Price</th><th>Tags</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody id="meals-tbody">${meals.map((m) => `
            <tr>
              <td><div class="admin-thumb">${m.primary_image_url ? `<img src="${m.primary_image_url}" alt="" />` : `<div class="img-placeholder"><i data-icon="image" data-size="16"></i></div>`}</div></td>
              <td>${m.name}</td>
              <td>${m.meal_categories?.name || '—'}</td>
              <td>${m.discount_price ? `<span style="text-decoration:line-through;color:var(--text-secondary);font-size:var(--fs-xs);">${formatNaira(m.price)}</span><br/>` : ''}${formatNaira(m.discount_price || m.price)}</td>
              <td>${tagBadges(m)}</td>
              <td>${availabilityBadge(m)}</td>
              <td>${new Date(m.created_at).toLocaleDateString()}</td>
              <td>
                <a class="btn btn-ghost btn-sm" href="meal-details.html?slug=${m.slug}" target="_blank" rel="noopener">View</a>
                <button class="btn btn-ghost btn-sm" data-edit="${m.id}">Edit</button>
                <button class="btn btn-ghost btn-sm" data-toggle="${m.id}" data-current="${m.availability}">${m.availability ? 'Disable' : 'Enable'}</button>
                <button class="btn btn-ghost btn-sm" data-delete="${m.id}">Delete</button>
              </td>
            </tr>`).join('') || '<tr><td colspan="8">No meals found</td></tr>'}</tbody>
        </table>
        <div id="meal-pagination" style="display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:var(--space-4);"></div>`;
      AromaIcons.hydrateIcons(panel);

      renderPagination(pagination);
      bindToolbar();
      bindRowActions(meals);

      document.getElementById('add-meal-btn').addEventListener('click', async () => {
        const dataPromise = formModal({ title: 'Add Meal', fieldsHtml: fieldsForMeal(), submitLabel: 'Create' });
        wireDropzone();
        const data = await dataPromise;
        if (!data) return;
        try {
          const { meal } = await window.AromaApi.post('/meals', cleanPayload(data));
          if (data.image) {
            try { await uploadMealPhoto(meal.id, data.image, { replace: false }); }
            catch (err) { toast(`Meal created, but the photo upload failed: ${friendlyError(err)}`, 'error'); load(); return; }
          }
          toast('Meal created.', 'success');
          load();
        } catch (err) { toast(friendlyError(err), 'error'); }
      });
    }

    function renderPagination(pagination) {
      const el = document.getElementById('meal-pagination');
      if (!pagination || pagination.pages <= 1) { el.innerHTML = ''; return; }
      el.innerHTML = `
        <button class="btn btn-outline btn-sm" data-page="${state.page - 1}" ${state.page <= 1 ? 'disabled' : ''}><i data-icon="chevronLeft" data-size="16"></i></button>
        <span class="text-muted" style="font-size:var(--fs-sm);">Page ${state.page} of ${pagination.pages} (${pagination.total} meals)</span>
        <button class="btn btn-outline btn-sm" data-page="${state.page + 1}" ${state.page >= pagination.pages ? 'disabled' : ''}><i data-icon="chevronRight" data-size="16"></i></button>`;
      AromaIcons.hydrateIcons(el);
      el.querySelectorAll('[data-page]').forEach((btn) => btn.addEventListener('click', () => { state.page = Number(btn.getAttribute('data-page')); load(); }));
    }

    function bindToolbar() {
      let debounceTimer;
      document.getElementById('meal-search').addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => { state.search = e.target.value.trim(); state.page = 1; load(); }, 350);
      });
      document.getElementById('meal-cat-filter').addEventListener('change', (e) => { state.category = e.target.value; state.page = 1; load(); });
      document.getElementById('meal-avail-filter').addEventListener('change', (e) => { state.availability = e.target.value; state.page = 1; load(); });
    }

    function bindRowActions(list) {
      document.querySelectorAll('[data-edit]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const meal = list.find((x) => x.id === btn.getAttribute('data-edit'));
          const dataPromise = formModal({ title: `Edit ${meal.name}`, fieldsHtml: fieldsForMeal(meal), submitLabel: 'Save' });
          const wasImageRemoved = wireDropzone();
          const data = await dataPromise;
          if (!data) return;
          try {
            await window.AromaApi.patch(`/meals/${meal.id}`, cleanPayload(data));
            if (data.image) {
              try { await uploadMealPhoto(meal.id, data.image, { replace: true }); }
              catch (err) { toast(`Meal saved, but the new photo failed to upload: ${friendlyError(err)}`, 'error'); load(); return; }
            } else if (wasImageRemoved() && meal.primary_image_url) {
              try { await window.AromaApi.delete(`/meals/${meal.id}/images`); }
              catch { /* non-fatal — meal fields already saved */ }
            }
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

    await load();
  },
};
