// Aroma FoodLand — shared page shell. Every HTML page includes an empty
// <div id="app-header"></div> / <div id="app-footer"></div> and this script
// fills them in, so the nav/footer markup lives in exactly one place
// (per the "reusable frontend components" requirement for a no-framework build).

const NAV_LINKS = [
  { href: 'index.html', label: 'Home' },
  { href: 'menu.html', label: 'Menu' },
  { href: 'about.html', label: 'About' },
  { href: 'reservations.html', label: 'Reservations' },
  { href: 'catering.html', label: 'Catering & Events' },
  { href: 'gallery.html', label: 'Gallery' },
  { href: 'contact.html', label: 'Contact' },
];

function currentPage() {
  return window.location.pathname.split('/').pop() || 'index.html';
}

function renderHeader() {
  const mount = document.getElementById('app-header');
  if (!mount) return;
  const page = currentPage();

  mount.innerHTML = `
    <header class="site-header">
      <div class="container">
        <a href="index.html" class="brand">
          <span class="brand-mark">AF</span>
          Aroma FoodLand
        </a>
        <nav class="main-nav" id="main-nav" aria-label="Primary">
          ${NAV_LINKS.map((l) => `<a href="${l.href}" ${l.href === page ? 'aria-current="page"' : ''}>${l.label}</a>`).join('')}
          <div class="header-actions" data-mobile-only>
            <a href="login.html" data-auth-slot></a>
          </div>
        </nav>
        <div class="header-actions">
          <button class="icon-btn" aria-label="Search" data-open="search">${AromaIcons.icon('search')}</button>
          <a class="icon-btn" href="notifications.html" aria-label="Notifications" data-require-auth>${AromaIcons.icon('bell')}</a>
          <a class="icon-btn" href="cart.html" aria-label="Cart">${AromaIcons.icon('cart')}<span class="count-badge" data-cart-count hidden>0</span></a>
          <a class="icon-btn" href="account.html" aria-label="Account" data-auth-icon>${AromaIcons.icon('user')}</a>
          <button class="mobile-nav-toggle icon-btn" aria-label="Menu" aria-expanded="false" data-mobile-toggle>${AromaIcons.icon('menu')}</button>
        </div>
      </div>
    </header>`;

  const toggle = mount.querySelector('[data-mobile-toggle]');
  const nav = mount.querySelector('#main-nav');
  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.innerHTML = AromaIcons.icon(isOpen ? 'close' : 'menu');
  });

  mount.querySelector('[data-open="search"]').addEventListener('click', () => { window.location.href = 'search.html'; });
}

function renderFooter() {
  const mount = document.getElementById('app-footer');
  if (!mount) return;
  const year = new Date().getFullYear();

  mount.innerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <div class="brand" style="color:var(--text-on-dark)"><span class="brand-mark">AF</span> Aroma FoodLand</div>
            <p>Restaurant, bar &amp; lounge, hotel, catering and events in Sapele, Delta State.</p>
            <div class="social-row" style="margin-top:16px;">
              <a href="#" aria-label="Facebook">${AromaIcons.icon('facebook', { size: 16 })}</a>
              <a href="#" aria-label="Instagram">${AromaIcons.icon('instagram', { size: 16 })}</a>
              <a href="#" aria-label="Twitter">${AromaIcons.icon('twitter', { size: 16 })}</a>
            </div>
          </div>
          <div>
            <h4>Explore</h4>
            <ul>
              <li><a href="menu.html">Menu</a></li>
              <li><a href="reservations.html">Reservations</a></li>
              <li><a href="catering.html">Catering &amp; Events</a></li>
              <li><a href="hotel.html">Hotel</a></li>
              <li><a href="gallery.html">Gallery</a></li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><a href="about.html">About Us</a></li>
              <li><a href="reviews.html">Reviews</a></li>
              <li><a href="contact.html">Contact</a></li>
              <li><a href="offers.html">Offers</a></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li>74 Okpe Road, beside Foodland, Sapele, Delta State</li>
              <li><a href="tel:+2348103980362">+234 810 398 0362</a></li>
              <li>7:00 AM – 9:30 PM, daily</li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© ${year} Aroma FoodLand. All rights reserved.</span>
          <div class="flex gap-3">
            <a href="privacy-policy.html">Privacy Policy</a>
            <a href="terms.html">Terms</a>
            <a href="refund-policy.html">Refund Policy</a>
          </div>
        </div>
      </div>
    </footer>`;
}

function applyAuthUI(user) {
  document.querySelectorAll('[data-auth-slot]').forEach((el) => {
    el.href = user ? 'account.html' : 'login.html';
    el.textContent = user ? `Hi, ${user.full_name?.split(' ')[0] || 'there'}` : 'Sign in';
  });
  document.querySelectorAll('[data-auth-icon]').forEach((el) => { el.href = user ? 'account.html' : 'login.html'; });
  document.querySelectorAll('[data-require-auth]').forEach((el) => { el.href = user ? el.href : 'login.html'; });
  document.querySelectorAll('[data-staff-only]').forEach((el) => {
    const staff = user && ['staff', 'manager', 'admin', 'super_admin'].includes(user.role);
    el.style.display = staff ? '' : 'none';
  });
  window.AromaCart?.refreshBadge();
}

// --- Scroll reveal: one small, deliberate effect, not per-card noise ---
function initScrollReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length || !('IntersectionObserver' in window)) {
    targets.forEach((t) => t.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  targets.forEach((t) => observer.observe(t));
}

// --- AI chat widget ---
function getAiSessionId() {
  let id = sessionStorage.getItem('aroma_ai_session');
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem('aroma_ai_session', id);
  }
  return id;
}

async function initAiWidget() {
  const mount = document.getElementById('app-ai-widget');
  if (!mount) return;

  mount.innerHTML = `
    <button class="ai-launcher" aria-label="Chat with Aroma FoodLand assistant" data-ai-toggle>${AromaIcons.icon('chat', { size: 24 })}</button>
    <div class="ai-panel" role="dialog" aria-label="Aroma FoodLand assistant">
      <div class="ai-panel-header">
        <strong>Aroma Assistant</strong>
        <button class="icon-btn" style="color:inherit" aria-label="Close chat" data-ai-close>${AromaIcons.icon('close', { size: 18 })}</button>
      </div>
      <div class="ai-messages" data-ai-messages></div>
      <form class="ai-input-row" data-ai-form>
        <input type="text" placeholder="Ask about our menu, hours…" aria-label="Message" data-ai-input maxlength="1000" required />
        <button class="btn btn-primary btn-icon" type="submit" aria-label="Send">${AromaIcons.icon('arrowRight', { size: 18 })}</button>
      </form>
    </div>`;

  const panel = mount.querySelector('.ai-panel');
  const messagesEl = mount.querySelector('[data-ai-messages]');
  const form = mount.querySelector('[data-ai-form]');
  const input = mount.querySelector('[data-ai-input]');
  let welcomed = false;

  function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = `ai-msg ai-msg-${role}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function openPanel() {
    panel.classList.add('is-open');
    if (!welcomed) {
      welcomed = true;
      try {
        const { welcome_message } = await window.AromaApi.get('/ai/welcome');
        addMessage('assistant', welcome_message);
      } catch {
        addMessage('assistant', "Hi! I'm the Aroma FoodLand assistant.");
      }
    }
  }

  mount.querySelector('[data-ai-toggle]').addEventListener('click', () => {
    panel.classList.contains('is-open') ? panel.classList.remove('is-open') : openPanel();
  });
  mount.querySelector('[data-ai-close]').addEventListener('click', () => panel.classList.remove('is-open'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    addMessage('user', message);
    input.value = '';
    input.disabled = true;

    const typing = document.createElement('div');
    typing.className = 'ai-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      const { reply } = await window.AromaApi.post('/ai/chat', { session_id: getAiSessionId(), message });
      typing.remove();
      addMessage('assistant', reply);
    } catch (err) {
      typing.remove();
      addMessage('assistant', window.AromaUI.friendlyError(err));
    } finally {
      input.disabled = false;
      input.focus();
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  renderHeader();
  renderFooter();
  AromaIcons.hydrateIcons();

  const aiMount = document.createElement('div');
  aiMount.id = 'app-ai-widget';
  document.body.appendChild(aiMount);
  initAiWidget();

  document.addEventListener('aroma:auth-changed', (e) => applyAuthUI(e.detail.user));
  await window.AromaAuth.init();

  initScrollReveal();
});
