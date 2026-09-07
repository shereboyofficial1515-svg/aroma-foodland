document.addEventListener('DOMContentLoaded', () => {
  const { mealCardHtml, bindAddToCartDelegation, formatNaira } = window.AromaRender;
  const { emptyState, friendlyError } = window.AromaUI;
  const input = document.getElementById('search-input');
  const resultsEl = document.getElementById('search-results');
  bindAddToCartDelegation(resultsEl);

  const initial = new URLSearchParams(window.location.search).get('q');
  if (initial) input.value = initial;

  let debounceTimer;
  async function run(q) {
    if (!q || q.trim().length < 2) { resultsEl.innerHTML = ''; return; }
    resultsEl.innerHTML = `<div class="skeleton" style="height:120px;"></div>`;
    try {
      const data = await window.AromaApi.get(`/search?q=${encodeURIComponent(q.trim())}`);
      if (data.empty) { resultsEl.innerHTML = emptyState({ icon: 'search', title: 'No results found', message: 'Try a different search term.' }); return; }

      let html = '';
      if (data.meals.length) {
        html += `<h3 style="margin-bottom:var(--space-3);">Meals</h3><div class="grid grid-3" style="margin-bottom:var(--space-6);">${data.meals.map((m) => mealCardHtml({ ...m, availability: m.availability !== false })).join('')}</div>`;
      }
      if (data.categories.length) {
        html += `<h3 style="margin-bottom:var(--space-3);">Categories</h3><div class="flex gap-2" style="margin-bottom:var(--space-6); flex-wrap:wrap;">${data.categories.map((c) => `<a class="category-chip" href="menu.html?category=${c.slug}">${c.name}</a>`).join('')}</div>`;
      }
      if (data.services.length) {
        html += `<h3 style="margin-bottom:var(--space-3);">Services</h3><div class="grid grid-2" style="margin-bottom:var(--space-6);">${data.services.map((s) => `<div class="feature-tile"><div><h4>${s.name}</h4><p>${s.description}</p></div></div>`).join('')}</div>`;
      }
      if (data.faqs.length) {
        html += `<h3 style="margin-bottom:var(--space-3);">Frequently asked</h3>${data.faqs.map((f) => `<div style="padding:var(--space-3) 0; border-bottom:1px solid var(--border-color);"><strong>${f.question}</strong><p style="margin-top:4px;">${f.answer}</p></div>`).join('')}`;
      }
      resultsEl.innerHTML = html;
      AromaIcons.hydrateIcons(resultsEl);
    } catch (err) {
      resultsEl.innerHTML = emptyState({ icon: 'alertCircle', title: 'Search failed', message: friendlyError(err) });
    }
  }

  input.addEventListener('input', () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(() => run(input.value), 350); });
  if (initial) run(initial);
});
