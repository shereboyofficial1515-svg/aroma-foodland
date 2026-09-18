document.addEventListener('DOMContentLoaded', async () => {
  const { formatNaira, starRow, mealCardHtml, bindAddToCartDelegation } = window.AromaRender;
  const { toast, emptyState, friendlyError, withButtonLoading } = window.AromaUI;

  const contentEl = document.getElementById('meal-content');
  const relatedEl = document.getElementById('related-meals');
  bindAddToCartDelegation(document.body);

  const slug = new URLSearchParams(window.location.search).get('slug');
  if (!slug) {
    contentEl.innerHTML = emptyState({ icon: 'alertCircle', title: 'Meal not found', message: 'No meal was specified.' });
    return;
  }

  try {
    const { meal, related } = await window.AromaApi.get(`/meals/${slug}`);

    document.getElementById('page-title').textContent = `${meal.name} — Aroma FoodLand`;
    document.getElementById('page-desc').setAttribute('content', meal.description || `${meal.name} at Aroma FoodLand, Sapele.`);

    const hasDiscount = meal.discount_price && Number(meal.discount_price) < Number(meal.price);
    const outOfStock = meal.availability && meal.stock === 0;
    const unavailable = !meal.availability || outOfStock;
    const images = meal.meal_images?.length ? meal.meal_images.map((i) => i.image_url) : (meal.primary_image_url ? [meal.primary_image_url] : []);

    contentEl.innerHTML = `
      <div class="grid grid-2">
        <div class="hero-media" style="aspect-ratio:4/3;">
          ${images.length
            ? `<img src="${images[0]}" alt="${meal.name}" style="width:100%;height:100%;object-fit:cover;" />`
            : `<div class="img-placeholder"><i data-icon="utensils" data-size="32"></i><span>${meal.name}</span></div>`}
        </div>
        <div>
          <div class="flex gap-2" style="margin-bottom:8px;">
            ${meal.is_new ? `<span class="badge badge-success">New</span>` : ''}
            ${meal.is_recommended ? `<span class="badge badge-neutral">Recommended</span>` : ''}
            ${meal.is_featured ? `<span class="badge badge-accent">Featured</span>` : ''}
            ${meal.is_popular ? `<span class="badge badge-accent">Popular</span>` : ''}
          </div>
          <h1>${meal.name}</h1>
          ${meal.rating_count ? `<div class="flex gap-2" style="margin:8px 0;">${starRow(meal.rating_avg, 16)} <span class="text-muted" style="font-size:var(--fs-sm)">${Number(meal.rating_avg).toFixed(1)} (${meal.rating_count} review${meal.rating_count === 1 ? '' : 's'})</span></div>` : ''}
          <p class="lede">${meal.description || ''}</p>
          <div style="margin:var(--space-4) 0;">
            <span class="price" style="font-size:var(--fs-xl);">${hasDiscount ? `<span class="price-original">${formatNaira(meal.price)}</span>` : ''}${formatNaira(meal.discount_price || meal.price)}</span>
          </div>
          ${!meal.availability ? `<div class="badge badge-error" style="margin-bottom:var(--space-4);">Currently unavailable</div>` : outOfStock ? `<div class="badge badge-warning" style="margin-bottom:var(--space-4);">Out of stock</div>` : ''}

          <div class="flex gap-3" style="margin-bottom:var(--space-5);">
            <div class="input-group" style="width:120px;">
              <button class="btn btn-ghost btn-icon" id="qty-minus" aria-label="Decrease quantity" type="button">${AromaIcons.icon('minus', { size: 16 })}</button>
              <input type="number" id="qty-input" value="1" min="1" max="20" style="text-align:center;border:none;" aria-label="Quantity" />
              <button class="btn btn-ghost btn-icon" id="qty-plus" aria-label="Increase quantity" type="button">${AromaIcons.icon('plus', { size: 16 })}</button>
            </div>
          </div>
          <div class="field">
            <label for="special-instructions">Special instructions (optional)</label>
            <textarea id="special-instructions" placeholder="E.g. less spicy, no onions…" maxlength="300"></textarea>
          </div>
          <div class="flex gap-3">
            <button class="btn btn-primary btn-lg" id="add-to-cart-btn" ${unavailable ? 'disabled' : ''}>${AromaIcons.icon('cart', { size: 18 })} Add to Cart</button>
            <button class="btn btn-outline btn-lg" id="buy-now-btn" ${unavailable ? 'disabled' : ''}>Buy Now</button>
          </div>

          <hr class="rule" />
          <dl style="display:grid; grid-template-columns: auto 1fr; gap: 8px 16px; font-size: var(--fs-sm);">
            ${meal.preparation_time_minutes ? `<dt class="text-muted">Prep time</dt><dd>${meal.preparation_time_minutes} minutes</dd>` : ''}
            ${meal.ingredients?.length ? `<dt class="text-muted">Ingredients</dt><dd>${meal.ingredients.join(', ')}</dd>` : ''}
            ${meal.allergens?.length && meal.allergens[0] !== 'None' ? `<dt class="text-muted">Allergens</dt><dd>${meal.allergens.join(', ')}</dd>` : ''}
            ${meal.spice_level ? `<dt class="text-muted">Spice level</dt><dd>${'●'.repeat(meal.spice_level)}${'○'.repeat(3 - meal.spice_level)}</dd>` : ''}
            ${meal.portion_info ? `<dt class="text-muted">Portion</dt><dd>${meal.portion_info}</dd>` : ''}
          </dl>
        </div>
      </div>`;
    AromaIcons.hydrateIcons(contentEl);

    const qtyInput = document.getElementById('qty-input');
    document.getElementById('qty-minus').addEventListener('click', () => { qtyInput.value = Math.max(1, Number(qtyInput.value) - 1); });
    document.getElementById('qty-plus').addEventListener('click', () => { qtyInput.value = Math.min(20, Number(qtyInput.value) + 1); });

    const addBtn = document.getElementById('add-to-cart-btn');
    addBtn.addEventListener('click', withButtonLoading(addBtn, async () => {
      const instructions = document.getElementById('special-instructions').value.trim() || null;
      try {
        await window.AromaCart.addItem(meal.id, Number(qtyInput.value), instructions);
      } catch (err) {
        toast(friendlyError(err), 'error');
      }
    }));

    document.getElementById('buy-now-btn').addEventListener('click', async () => {
      if (!window.AromaAuth.user) { window.AromaAuth.requireLogin(); return; }
      try {
        const instructions = document.getElementById('special-instructions').value.trim() || null;
        await window.AromaCart.addItem(meal.id, Number(qtyInput.value), instructions);
        window.location.href = 'checkout.html';
      } catch (err) {
        toast(friendlyError(err), 'error');
      }
    });

    if (related?.length) {
      relatedEl.innerHTML = related.map(mealCardHtml).join('');
      bindAddToCartDelegation(relatedEl);
      AromaIcons.hydrateIcons(relatedEl);
    } else {
      relatedEl.innerHTML = '';
    }
  } catch (err) {
    contentEl.innerHTML = emptyState({ icon: 'alertCircle', title: 'This meal could not be found', message: friendlyError(err) });
  }
});
