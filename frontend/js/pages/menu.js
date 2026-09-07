document.addEventListener('DOMContentLoaded', async () => {
  const { mealCardHtml, bindAddToCartDelegation } = window.AromaRender;
  const { skeletonCard, emptyState, friendlyError } = window.AromaUI;

  const grid = document.getElementById('menu-grid');
  const infoEl = document.getElementById('menu-results-info');
  const paginationEl = document.getElementById('menu-pagination');
  const searchInput = document.getElementById('menu-search');
  const sortSelect = document.getElementById('menu-sort');
  const priceSelect = document.getElementById('menu-max-price');
  const categoriesEl = document.getElementById('menu-categories');

  bindAddToCartDelegation(grid);

  const params = new URLSearchParams(window.location.search);
  const state = {
    search: params.get('search') || '',
    category: params.get('category') || '',
    sort: 'newest',
    max_price: '',
    page: 1,
  };
  searchInput.value = state.search;

  let debounceTimer;
  function debounce(fn, delay) {
    return (...args) => { clearTimeout(debounceTimer); debounceTimer = setTimeout(() => fn(...args), delay); };
  }

  async function loadCategories() {
    try {
      const { categories } = await window.AromaApi.get('/categories');
      categoriesEl.innerHTML = `<button class="category-chip" aria-pressed="${!state.category}" data-cat="">All</button>` +
        categories.map((c) => `<button class="category-chip" aria-pressed="${state.category === c.slug}" data-cat="${c.slug}">${c.name}</button>`).join('');
      categoriesEl.querySelectorAll('[data-cat]').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.category = btn.getAttribute('data-cat');
          state.page = 1;
          categoriesEl.querySelectorAll('[data-cat]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
          load();
        });
      });
    } catch { /* categories are non-critical */ }
  }

  async function load() {
    grid.innerHTML = Array.from({ length: 8 }, skeletonCard).join('');
    infoEl.textContent = '';
    paginationEl.innerHTML = '';

    const qs = new URLSearchParams();
    if (state.search) qs.set('search', state.search);
    if (state.category) qs.set('category', state.category);
    if (state.sort) qs.set('sort', state.sort);
    if (state.max_price) qs.set('max_price', state.max_price);
    qs.set('page', state.page);
    qs.set('limit', 16);

    try {
      const { meals, pagination } = await window.AromaApi.get(`/meals?${qs.toString()}`);
      if (!meals.length) {
        grid.innerHTML = emptyState({ icon: 'search', title: 'No meals found', message: 'Try a different search term or category.' });
        return;
      }
      grid.innerHTML = meals.map(mealCardHtml).join('');
      AromaIcons.hydrateIcons(grid);
      infoEl.textContent = `${pagination.total} meal${pagination.total === 1 ? '' : 's'} found`;
      renderPagination(pagination);
    } catch (err) {
      grid.innerHTML = emptyState({ icon: 'alertCircle', title: 'Could not load the menu', message: friendlyError(err) });
    }
  }

  function renderPagination(pagination) {
    if (pagination.pages <= 1) return;
    const buttons = [];
    buttons.push(`<button class="btn btn-outline btn-sm" data-page="${state.page - 1}" ${state.page <= 1 ? 'disabled' : ''}>${AromaIcons.icon('chevronLeft', { size: 16 })}</button>`);
    buttons.push(`<span class="text-muted" style="font-size:var(--fs-sm)">Page ${state.page} of ${pagination.pages}</span>`);
    buttons.push(`<button class="btn btn-outline btn-sm" data-page="${state.page + 1}" ${state.page >= pagination.pages ? 'disabled' : ''}>${AromaIcons.icon('chevronRight', { size: 16 })}</button>`);
    paginationEl.innerHTML = buttons.join('');
    paginationEl.querySelectorAll('[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => { state.page = Number(btn.getAttribute('data-page')); load(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    });
  }

  searchInput.addEventListener('input', debounce(() => { state.search = searchInput.value.trim(); state.page = 1; load(); }, 350));
  sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; state.page = 1; load(); });
  priceSelect.addEventListener('change', () => { state.max_price = priceSelect.value; state.page = 1; load(); });

  await loadCategories();
  await load();
});
