// Aroma FoodLand — shared UI helpers: toasts, confirm modals, button
// loading states. Reusable functions rather than a framework, per the
// "vanilla JS but still modular/reusable" requirement.

function ensureToastRegion() {
  let region = document.getElementById('toast-region');
  if (!region) {
    region = document.createElement('div');
    region.id = 'toast-region';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    document.body.appendChild(region);
  }
  return region;
}

function toast(message, type = 'default', duration = 4000) {
  const region = ensureToastRegion();
  const el = document.createElement('div');
  el.className = `toast ${type === 'error' ? 'toast-error' : type === 'success' ? 'toast-success' : ''}`;
  const iconName = type === 'error' ? 'alertCircle' : type === 'success' ? 'check' : 'info';
  el.innerHTML = `${AromaIcons.icon(iconName, { size: 18 })}<span>${message}</span>`;
  region.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 200ms ease';
    setTimeout(() => el.remove(), 220);
  }, duration);
}

// Promise-based confirmation modal — replaces window.confirm with something
// that matches the brand and is accessible (traps focus is a v2 nicety; for
// now it moves focus to the confirm button, which covers the common case).
function confirmModal({ title = 'Are you sure?', message = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = {}) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <h3 id="confirm-title">${title}</h3>
        <p style="margin-top:8px;">${message}</p>
        <div class="modal-actions">
          <button class="btn btn-outline" data-action="cancel">${cancelLabel}</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="confirm">${confirmLabel}</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('is-open'));

    function close(result) {
      backdrop.classList.remove('is-open');
      setTimeout(() => backdrop.remove(), 200);
      resolve(result);
    }

    backdrop.querySelector('[data-action="confirm"]').addEventListener('click', () => close(true));
    backdrop.querySelector('[data-action="cancel"]').addEventListener('click', () => close(false));
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(false); });
    backdrop.querySelector('[data-action="confirm"]').focus();
  });
}

// Wraps an async click handler on a button: disables it, swaps in a
// spinner, and always restores the original label — so nothing ever looks
// frozen or stays disabled after an error.
function withButtonLoading(button, fn) {
  return async (...args) => {
    const original = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<span class="spinner" aria-hidden="true"></span> Please wait…`;
    try {
      await fn(...args);
    } finally {
      button.disabled = false;
      button.innerHTML = original;
    }
  };
}

function skeletonCard() {
  return `<div class="meal-card"><div class="skeleton meal-card-media"></div><div class="meal-card-body">
    <div class="skeleton" style="height:18px;width:70%;"></div>
    <div class="skeleton" style="height:14px;width:90%;"></div>
    <div class="skeleton" style="height:24px;width:40%;margin-top:8px;"></div>
  </div></div>`;
}

function emptyState({ icon = 'info', title, message }) {
  return `<div class="empty-state">${AromaIcons.icon(icon, { size: 40 })}<h3>${title}</h3><p>${message}</p></div>`;
}

function friendlyError(err) {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
}

// Generic form modal — renders arbitrary field HTML inside the standard
// modal chrome and resolves with either the submitted FormData-like object
// (as a plain key→value map read from inputs with [name]) or null if
// cancelled. Used across the admin dashboard for create/edit dialogs so we
// don't hand-roll a bespoke modal per entity.
function formModal({ title, fieldsHtml, submitLabel = 'Save' }) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" style="max-width:520px;" role="dialog" aria-modal="true" aria-labelledby="form-modal-title">
        <h3 id="form-modal-title">${title}</h3>
        <form id="form-modal-form" style="margin-top:16px;">${fieldsHtml}
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" data-action="cancel">Cancel</button>
            <button type="submit" class="btn btn-primary">${submitLabel}</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('is-open'));
    if (window.AromaIcons) window.AromaIcons.hydrateIcons(backdrop);

    function close(result) {
      backdrop.classList.remove('is-open');
      setTimeout(() => backdrop.remove(), 200);
      resolve(result);
    }

    const form = backdrop.querySelector('#form-modal-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {};
      form.querySelectorAll('[name]').forEach((el) => {
        if (el.type === 'checkbox') data[el.name] = el.checked;
        else data[el.name] = el.value;
      });
      close(data);
    });
    backdrop.querySelector('[data-action="cancel"]').addEventListener('click', () => close(null));
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(null); });
    form.querySelector('input,textarea,select')?.focus();
  });
}

window.AromaUI = { toast, confirmModal, formModal, withButtonLoading, skeletonCard, emptyState, friendlyError };
