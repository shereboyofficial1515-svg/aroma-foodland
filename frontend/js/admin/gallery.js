window.AdminSections = window.AdminSections || {};
window.AdminSections.gallery = {
  async render(panel) {
    const { toast, friendlyError, confirmModal } = window.AromaUI;

    async function load() {
      const { images } = await window.AromaApi.get('/gallery');
      panel.innerHTML = `
        <div class="admin-toolbar">
          <form id="gallery-upload-form" class="flex gap-3" style="align-items:center;">
            <select id="gallery-category"><option value="interior">Interior</option><option value="exterior">Exterior</option><option value="food">Food</option><option value="events">Events</option><option value="hotel">Hotel</option><option value="general">General</option></select>
            <input type="file" id="gallery-files" accept="image/*" multiple required />
            <button type="submit" class="btn btn-primary btn-sm" id="gallery-upload-btn">Upload</button>
          </form>
        </div>
        <div class="gallery-grid">${images.map((img) => `
          <figure style="position:relative;">
            ${img.image_url.startsWith('/assets') ? `<div class="img-placeholder"><i data-icon="image"></i></div>` : `<img src="${img.image_url}" style="width:100%;height:100%;object-fit:cover;" />`}
            <button class="icon-btn" data-del-img="${img.id}" style="position:absolute;top:6px;right:6px;background:rgba(255,255,255,0.85);" aria-label="Delete image">${AromaIcons.icon('trash', { size: 14 })}</button>
          </figure>`).join('') || '<p>No images yet.</p>'}</div>`;
      AromaIcons.hydrateIcons(panel);

      document.getElementById('gallery-upload-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('gallery-upload-btn');
        const files = document.getElementById('gallery-files').files;
        if (!files.length) return;
        const fd = new FormData();
        Array.from(files).forEach((f) => fd.append('images', f));
        fd.append('category', document.getElementById('gallery-category').value);
        const run = window.AromaUI.withButtonLoading(btn, async () => {
          try { await window.AromaApi.upload('/gallery', fd); toast('Images uploaded.', 'success'); load(); }
          catch (err) { toast(friendlyError(err), 'error'); }
        });
        run();
      });

      panel.querySelectorAll('[data-del-img]').forEach((btn) => btn.addEventListener('click', async () => {
        const ok = await confirmModal({ title: 'Delete image?', confirmLabel: 'Delete', danger: true });
        if (!ok) return;
        try { await window.AromaApi.delete(`/gallery/${btn.getAttribute('data-del-img')}`); load(); }
        catch (err) { toast(friendlyError(err), 'error'); }
      }));
    }

    await load();
  },
};
