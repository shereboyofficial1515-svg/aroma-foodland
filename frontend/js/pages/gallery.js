document.addEventListener('DOMContentLoaded', async () => {
  const { galleryItemHtml } = window.AromaRender;
  const { emptyState, friendlyError } = window.AromaUI;
  const gridEl = document.getElementById('gallery-grid');
  const filtersEl = document.getElementById('gallery-filters');

  async function load(category = '') {
    gridEl.innerHTML = Array.from({ length: 8 }, () => `<figure class="skeleton"></figure>`).join('');
    try {
      const qs = category ? `?category=${category}` : '';
      const { images } = await window.AromaApi.get(`/gallery${qs}`);
      gridEl.innerHTML = images.length ? images.map(galleryItemHtml).join('') : emptyState({ icon: 'image', title: 'No images yet', message: 'Check back soon.' });
      AromaIcons.hydrateIcons(gridEl);
    } catch (err) {
      gridEl.innerHTML = emptyState({ icon: 'alertCircle', title: 'Could not load gallery', message: friendlyError(err) });
    }
  }

  filtersEl.querySelectorAll('[data-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      filtersEl.querySelectorAll('[data-cat]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      load(btn.getAttribute('data-cat'));
    });
  });

  load();
});
