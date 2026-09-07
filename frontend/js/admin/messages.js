window.AdminSections = window.AdminSections || {};
window.AdminSections.messages = {
    async render(panel) {
        const { toast, friendlyError, emptyState } = window.AromaUI;

        async function load(unreadOnly = false) {
            const { messages } = await window.AromaApi.get(`/contact${unreadOnly ? '?unread_only=true' : ''}`);

            panel.innerHTML = `
        <div class="admin-toolbar">
          <label style="display:flex;align-items:center;gap:8px;font-size:var(--fs-sm);">
            <input type="checkbox" id="unread-only-toggle" style="width:auto;" ${unreadOnly ? 'checked' : ''} /> Unread only
          </label>
        </div>
        ${messages.length ? messages.map((m) => `
          <div class="list-row" style="align-items:flex-start; ${m.is_read ? '' : 'border-left:3px solid var(--primary-color);'}">
            <div class="list-row-main" style="flex:1;">
              <strong>${m.subject || 'General inquiry'}</strong>
              <div class="list-row-meta">
                <span>${m.name}</span>
                <span><a href="mailto:${m.email}">${m.email}</a></span>
                ${m.phone ? `<span>${m.phone}</span>` : ''}
                <span>${new Date(m.created_at).toLocaleString('en-NG')}</span>
              </div>
              <p style="margin-top:8px; font-size:var(--fs-sm); color:var(--text-secondary); white-space:pre-wrap;">${m.message}</p>
            </div>
            <div class="flex gap-2">
              ${!m.is_read ? `<button class="btn btn-ghost btn-sm" data-read="${m.id}">Mark read</button>` : '<span class="badge badge-success">Read</span>'}
              <a class="btn btn-outline btn-sm" href="mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject || 'Your message to Aroma FoodLand')}">Reply</a>
            </div>
          </div>`).join('') : emptyState({ icon: 'mail', title: 'No messages', message: unreadOnly ? 'No unread messages.' : 'Contact form submissions will appear here.' })}`;
            AromaIcons.hydrateIcons(panel);

            document.getElementById('unread-only-toggle').addEventListener('change', (e) => load(e.target.checked));
            panel.querySelectorAll('[data-read]').forEach((btn) => btn.addEventListener('click', async () => {
                try { await window.AromaApi.patch(`/contact/${btn.getAttribute('data-read')}/read`); load(unreadOnly); }
                catch (err) { toast(friendlyError(err), 'error'); }
            }));
        }

        await load();
    },
};