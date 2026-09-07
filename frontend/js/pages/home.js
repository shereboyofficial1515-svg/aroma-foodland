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

  // --- Services (static knowledge, mirrors the AI assistant's grounding) ---
  const SERVICE_ICONS = { restaurant: 'utensils', 'food-ordering': 'cart', 'indoor-catering': 'party', 'outdoor-catering': 'party', 'bar-lounge': 'wine', hotel: 'bed', events: 'party', meetings: 'orders', parking: 'parking', reservations: 'calendar' };
  const SERVICES = [
    { slug: 'restaurant', name: 'Restaurant', description: 'Dine in with a full Nigerian and intercontinental menu.' },
    { slug: 'bar-lounge', name: 'Bar & Lounge', description: 'Relax with a curated drinks menu in a comfortable lounge.' },
    { slug: 'hotel', name: 'Hotel', description: 'Comfortable rooms for guests staying in Sapele.' },
    { slug: 'indoor-catering', name: 'Catering', description: 'Indoor and outdoor catering for any size of event.' },
    { slug: 'events', name: 'Events', description: 'Weddings, birthdays, corporate functions and more.' },
    { slug: 'reservations', name: 'Reservations', description: 'Book a table ahead of your visit — no waiting around.' },
  ];
  servicesEl.innerHTML = SERVICES.map((s) => `
    <div class="feature-tile reveal">
      <div class="icon-wrap">${icon(SERVICE_ICONS[s.slug] || 'info')}</div>
      <div><h4>${s.name}</h4><p>${s.description}</p></div>
    </div>`).join('');
  AromaIcons.hydrateIcons(servicesEl);

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
    galleryEl.innerHTML = items.slice(0, 4).map(galleryItemHtml).join('') || emptyState({ icon: 'image', title: 'Gallery coming soon', message: '' });
    AromaIcons.hydrateIcons(galleryEl);
  } catch {
    galleryEl.innerHTML = '';
  }
});
