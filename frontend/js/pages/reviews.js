document.addEventListener('DOMContentLoaded', async () => {
  const { reviewCardHtml } = window.AromaRender;
  const { toast, friendlyError, withButtonLoading, emptyState } = window.AromaUI;

  await window.AromaAuth.init();
  const orderId = new URLSearchParams(window.location.search).get('order_id');
  const formMount = document.getElementById('review-form-mount');

  if (orderId && window.AromaAuth.user) {
    formMount.innerHTML = `
      <form id="review-form" style="max-width:480px; background:var(--surface-color); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:var(--space-5); margin-bottom:var(--space-8);">
        <h3>Leave a review</h3>
        <div class="field" style="margin-top:var(--space-3);">
          <label>Rating</label>
          <div id="star-picker" style="display:flex; gap:6px;">
            ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="btn-ghost" data-star="${n}" style="border:none;background:none;padding:2px;" aria-label="${n} star${n > 1 ? 's' : ''}">${AromaIcons.icon('star', { size: 24 })}</button>`).join('')}
          </div>
        </div>
        <div class="field">
          <label for="review-comment">Comment (optional)</label>
          <textarea id="review-comment" maxlength="1000" placeholder="Tell us about your experience…"></textarea>
        </div>
        <button type="submit" class="btn btn-primary" id="review-submit">Submit Review</button>
      </form>`;

    let rating = 0;
    const stars = formMount.querySelectorAll('[data-star]');
    function paintStars() {
      stars.forEach((s) => { s.style.color = Number(s.getAttribute('data-star')) <= rating ? 'var(--accent-color)' : 'var(--border-color-strong)'; });
    }
    stars.forEach((s) => s.addEventListener('click', () => { rating = Number(s.getAttribute('data-star')); paintStars(); }));

    const form = document.getElementById('review-form');
    const submitBtn = document.getElementById('review-submit');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!rating) { toast('Please select a star rating.', 'error'); return; }
      const run = withButtonLoading(submitBtn, async () => {
        try {
          await window.AromaApi.post('/reviews', { order_id: orderId, rating, comment: document.getElementById('review-comment').value.trim() || null });
          toast('Thanks for your review!', 'success');
          formMount.innerHTML = `<div class="badge badge-success" style="margin-bottom:var(--space-6);">Review submitted — pending approval</div>`;
        } catch (err) { toast(friendlyError(err), 'error'); }
      });
      run();
    });
  }

  const gridEl = document.getElementById('reviews-grid');
  const loadMoreEl = document.getElementById('reviews-load-more');
  let page = 1;

  async function loadPage(reset = false) {
    if (reset) { gridEl.innerHTML = Array.from({ length: 6 }, () => `<div class="skeleton" style="height:140px;"></div>`).join(''); page = 1; }
    try {
      const { reviews, pagination } = await window.AromaApi.get(`/reviews?page=${page}&limit=9`);
      if (reset) gridEl.innerHTML = '';
      if (page === 1 && !reviews.length) { gridEl.innerHTML = emptyState({ icon: 'star', title: 'No reviews yet', message: 'Be the first to share your experience.' }); loadMoreEl.innerHTML = ''; return; }
      gridEl.insertAdjacentHTML('beforeend', reviews.map(reviewCardHtml).join(''));
      AromaIcons.hydrateIcons(gridEl);
      loadMoreEl.innerHTML = page * 9 < pagination.total ? `<button class="btn btn-outline" id="load-more-btn">Load more</button>` : '';
      const btn = document.getElementById('load-more-btn');
      if (btn) btn.addEventListener('click', () => { page += 1; loadPage(false); });
    } catch (err) {
      gridEl.innerHTML = emptyState({ icon: 'alertCircle', title: 'Could not load reviews', message: friendlyError(err) });
    }
  }

  loadPage(true);
});
