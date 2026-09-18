// Aroma FoodLand — shared markup builders. Keeping these in one file means
// the meal card on the homepage, menu page, and search results all look
// and behave identically.

function formatNaira(amount) {
  return `₦${Number(amount).toLocaleString('en-NG')}`;
}

function initialsOf(name) {
  return (name || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

function starRow(rating, size = 14) {
  const full = Math.round(rating || 0);
  return Array.from({ length: 5 }, (_, i) =>
    `<span style="color:${i < full ? 'var(--accent-color)' : 'var(--border-color-strong)'}">${AromaIcons.icon('star', { size })}</span>`
  ).join('');
}

function mealCardHtml(meal) {
  const hasDiscount = meal.discount_price && Number(meal.discount_price) < Number(meal.price);
  const outOfStock = meal.availability !== false && meal.stock === 0;
  const unavailable = meal.availability === false || outOfStock;
  return `
    <article class="meal-card" data-meal-id="${meal.id}">
      <a href="meal-details.html?slug=${meal.slug}" class="meal-card-media" aria-label="${meal.name}">
        ${meal.primary_image_url
          ? `<img src="${meal.primary_image_url}" alt="${meal.name}" loading="lazy" style="width:100%;height:100%;object-fit:cover;" />`
          : `<div class="img-placeholder"><i data-icon="utensils" data-size="28"></i><span>${meal.name}</span></div>`}
        ${meal.is_new ? `<span class="badge badge-success">New</span>` : ''}
        ${hasDiscount ? `<span class="badge badge-accent">Discount</span>` : ''}
        ${meal.availability === false ? `<span class="badge badge-error">Unavailable</span>` : outOfStock ? `<span class="badge badge-warning">Out of stock</span>` : ''}
      </a>
      <div class="meal-card-body">
        <div class="meal-card-title">
          <h3><a href="meal-details.html?slug=${meal.slug}">${meal.name}</a></h3>
        </div>
        ${meal.rating_count ? `<span class="rating-inline">${AromaIcons.icon('star', { size: 14 })} ${Number(meal.rating_avg).toFixed(1)} (${meal.rating_count})</span>` : ''}
        <p class="meal-card-desc">${meal.description || ''}</p>
        <div class="meal-card-footer">
          <span class="price">${hasDiscount ? `<span class="price-original">${formatNaira(meal.price)}</span>` : ''}${formatNaira(meal.discount_price || meal.price)}</span>
          <button class="btn btn-primary btn-sm" data-add-to-cart="${meal.id}" ${unavailable ? 'disabled' : ''}>
            ${AromaIcons.icon('cart', { size: 16 })} Add
          </button>
        </div>
      </div>
    </article>`;
}

function reviewCardHtml(review) {
  const name = review.profiles?.full_name || 'Guest';
  return `
    <div class="review-card">
      <div class="review-stars">${starRow(review.rating, 16)}</div>
      <p>"${(review.comment || '').replace(/</g, '&lt;')}"</p>
      <div class="review-author">
        <div class="avatar">${initialsOf(name)}</div>
        <div><strong>${name}</strong></div>
      </div>
    </div>`;
}

function galleryItemHtml(image) {
  return `
    <figure>
      ${image.image_url && !image.image_url.startsWith('/assets/placeholders')
        ? `<img src="${image.image_url}" alt="${image.caption || 'Aroma FoodLand'}" loading="lazy" style="width:100%;height:100%;object-fit:cover;" />`
        : `<div class="img-placeholder"><i data-icon="image" data-size="24"></i></div>`}
    </figure>`;
}

// Delegated "Add to cart" handler — attach once per container that renders
// meal cards, rather than re-binding a listener per card.
function bindAddToCartDelegation(container) {
  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-add-to-cart]');
    if (!btn) return;
    const mealId = btn.getAttribute('data-add-to-cart');
    const run = window.AromaUI.withButtonLoading(btn, () => window.AromaCart.addItem(mealId));
    try {
      await run();
    } catch (err) {
      window.AromaUI.toast(window.AromaUI.friendlyError(err), 'error');
    }
  });
}

window.AromaRender = { formatNaira, initialsOf, starRow, mealCardHtml, reviewCardHtml, galleryItemHtml, bindAddToCartDelegation };
