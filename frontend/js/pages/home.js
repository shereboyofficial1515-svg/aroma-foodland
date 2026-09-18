// Aroma FoodLand — homepage.
document.addEventListener('DOMContentLoaded', async () => {
  const { icon } = window.AromaIcons;
  const { formatNaira, mealCardHtml, reviewCardHtml, galleryItemHtml, bindAddToCartDelegation } = window.AromaRender;
  const { skeletonCard, emptyState, friendlyError } = window.AromaUI;

  const popularEl = document.getElementById('popular-meals');
  const categoriesEl = document.getElementById('home-categories');
  const servicesEl = document.getElementById('home-services');
  const reviewsEl = document.getElementById('home-reviews');
  const galleryEl = document.getElementById('home-gallery');

  bindAddToCartDelegation(popularEl);

  // --- Popular meals ---
  popularEl.innerHTML = Array.from({ length: 4 }, skeletonCard).join('');
  try {
    const { meals } = await window.AromaApi.get('/meals?popular=true&limit=8');
    popularEl.innerHTML = meals.length
      ? meals.slice(0, 8).map(mealCardHtml).join('')
      : emptyState({ icon: 'utensils', title: 'No popular meals yet', message: 'Check back soon, or browse the full menu.' });
    AromaIcons.hydrateIcons(popularEl);
  } catch (err) {
    popularEl.innerHTML = emptyState({ icon: 'alertCircle', title: 'Could not load meals', message: friendlyError(err) });
  }

  // --- Categories ---
  try {
    const { categories } = await window.AromaApi.get('/categories');
    categoriesEl.innerHTML = categories.map((c) => `<a href="menu.html?category=${c.slug}" class="category-chip">${c.name}</a>`).join('');
  } catch { categoriesEl.innerHTML = ''; }

  // --- Services (live from the database — managed at Admin -> Services) ---
  const SERVICE_ICONS = { restaurant: 'utensils', 'food-ordering': 'cart', 'indoor-catering': 'party', 'outdoor-catering': 'party', catering: 'party', 'bar-lounge': 'wine', hotel: 'bed', events: 'party', meetings: 'orders', parking: 'parking', reservations: 'calendar' };
  try {
    const { services } = await window.AromaApi.get('/services');
    servicesEl.innerHTML = services.length
      ? services.map((s, i) => `
        <div class="feature-tile reveal" style="transition-delay:${Math.min(i, 5) * 60}ms;">
          ${s.image_url
          ? `<div class="icon-wrap" style="overflow:hidden; padding:0;"><img src="${s.image_url}" alt="" style="width:100%;height:100%;object-fit:cover;" /></div>`
          : `<div class="icon-wrap">${icon(SERVICE_ICONS[s.slug] || 'info')}</div>`}
          <div>
            <h4>${s.name}${s.price ? ` <span class="text-muted" style="font-weight:400; font-size:var(--fs-sm);">— from ${formatNaira(s.price)}</span>` : ''}</h4>
            <p>${s.description || ''}</p>
          </div>
        </div>`).join('')
      : emptyState({ icon: 'party', title: 'No services available yet', message: 'Services added from the admin dashboard will appear here.' });
    AromaIcons.hydrateIcons(servicesEl);
    initScrollReveal?.();
  } catch (err) {
    servicesEl.innerHTML = emptyState({ icon: 'alertCircle', title: 'Could not load services', message: friendlyError(err) });
  }

  // --- Reviews ---
  try {
    const { reviews } = await window.AromaApi.get('/reviews?limit=3');
    reviewsEl.innerHTML = reviews.length
      ? reviews.slice(0, 3).map(reviewCardHtml).join('')
      : emptyState({ icon: 'star', title: 'No reviews yet', message: 'Be the first to share your experience.' });
    AromaIcons.hydrateIcons(reviewsEl);
  } catch {
    reviewsEl.innerHTML = '';
  }

  // --- Gallery preview ---
  try {
    const { images } = await window.AromaApi.get('/gallery?featured=true');
    const items = images.length ? images : [];
    galleryEl.innerHTML = items.slice(0, 4).map(galleryItemHtml).join('') || emptyState({ icon: 'image', title: 'No photos yet', message: 'Check back soon for a look inside Aroma FoodLand.' });
    AromaIcons.hydrateIcons(galleryEl);
  } catch {
    galleryEl.innerHTML = '';
  }
});