window.AdminSections = window.AdminSections || {};
window.AdminSections.services = {
    async render(panel) {
        const { formatNaira } = window.AromaRender;
        const { toast, friendlyError, confirmModal, formModal } = window.AromaUI;

        async function load() {
            const { services } = await window.AromaApi.get('/services');

            panel.innerHTML = `
        <div class="admin-toolbar">
          <span class="text-muted" style="font-size:var(--fs-sm);">These appear on the public homepage "Our Services" section.</span>
          <button class="btn btn-primary" id="add-service-btn"><i data-icon="plus" data-size="16"></i> Add Service</button>
        </div>
        ${services.length ? `<table class="admin-table">
          <thead><tr><th>Image</th><th>Name</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${services.map((s) => `
            <tr>
              <td>${s.image_url ? `<img src="${s.image_url}" alt="" style="width:44px;height:44px;object-fit:cover;border-radius:8px;" />` : `<div class="img-placeholder" style="width:44px;height:44px;border-radius:8px;"><i data-icon="image" data-size="16"></i></div>`}</td>
              <td>${s.name}${s.description ? `<div class="text-muted" style="font-size:var(--fs-xs); max-width:280px;">${s.description}</div>` : ''}</td>
              <td>${s.price ? formatNaira(s.price) : '—'}</td>
              <td>${s.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-neutral">Disabled</span>'}</td>
              <td>
                <label class="btn btn-ghost btn-sm" style="cursor:pointer;">Upload image<input type="file" accept="image/*" data-upload-image="${s.id}" style="display:none;" /></label>
                <button class="btn btn-ghost btn-sm" data-edit="${s.id}">Edit</button>
                <button class="btn btn-ghost btn-sm" data-toggle="${s.id}" data-current="${s.is_active}">${s.is_active ? 'Disable' : 'Enable'}</button>
                <button class="btn btn-ghost btn-sm" data-delete="${s.id}">Delete</button>
              </td>
            </tr>`).join('')}</tbody>
        </table>` : `<div class="empty-state">No services yet — add your first one above.</div>`}`;
            AromaIcons.hydrateIcons(panel);

            const fields = (s = {}) => `
        <div class="field"><label>Name</label><input name="name" value="${s.name || ''}" required /></div>
        <div class="field"><label>Description</label><textarea name="description">${s.description || ''}</textarea></div>
        <div class="grid grid-2">
          <div class="field"><label>Price (₦, optional)</label><input name="price" type="number" min="0" value="${s.price || ''}" /></div>
          <div class="field"><label>Display order</label><input name="display_order" type="number" min="0" value="${s.display_order ?? 0}" /></div>
        </div>
        <label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" name="is_active" style="width:auto;" ${s.is_active !== false ? 'checked' : ''} /> Active (visible on the public site)</label>`;

            function cleanPayload(data) {
                return { ...data, price: data.price ? Number(data.price) : null, display_order: Number(data.display_order) || 0 };
            }

            document.getElementById('add-service-btn').addEventListener('click', async () => {
                const data = await formModal({ title: 'Add Service', fieldsHtml: fields(), submitLabel: 'Create' });
                if (!data) return;
                try { await window.AromaApi.post('/services', cleanPayload(data)); toast('Service created.', 'success'); load(); }
                catch (err) { toast(friendlyError(err), 'error'); }
            });

            panel.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', async () => {
                const service = services.find((s) => s.id === btn.getAttribute('data-edit'));
                const data = await formModal({ title: `Edit ${service.name}`, fieldsHtml: fields(service), submitLabel: 'Save' });
                if (!data) return;
                try { await window.AromaApi.patch(`/services/${service.id}`, cleanPayload(data)); toast('Service updated.', 'success'); load(); }
                catch (err) { toast(friendlyError(err), 'error'); }
            }));

            panel.querySelectorAll('[data-toggle]').forEach((btn) => btn.addEventListener('click', async () => {
                const current = btn.getAttribute('data-current') === 'true';
                try { await window.AromaApi.patch(`/services/${btn.getAttribute('data-toggle')}`, { is_active: !current }); load(); }
                catch (err) { toast(friendlyError(err), 'error'); }
            }));

            panel.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', async () => {
                const ok = await confirmModal({ title: 'Delete service?', confirmLabel: 'Delete', danger: true });
                if (!ok) return;
                try { await window.AromaApi.delete(`/services/${btn.getAttribute('data-delete')}`); toast('Service deleted.', 'success'); load(); }
                catch (err) { toast(friendlyError(err), 'error'); }
            }));

            panel.querySelectorAll('[data-upload-image]').forEach((input) => input.addEventListener('change', async () => {
                const file = input.files[0];
                if (!file) return;
                const fd = new FormData();
                fd.append('image', file);
                try { await window.AromaApi.upload(`/services/${input.getAttribute('data-upload-image')}/image`, fd); toast('Image uploaded.', 'success'); load(); }
                catch (err) { toast(friendlyError(err), 'error'); }
            }));
        }

        await load();
    },
};