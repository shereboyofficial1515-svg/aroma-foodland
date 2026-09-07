document.addEventListener('DOMContentLoaded', async () => {
  const { emptyState, friendlyError, toast } = window.AromaUI;
  const listEl = document.getElementById('notifications-list');

  await window.AromaAuth.init();
  if (!window.AromaAuth.requireLogin()) return;

  async function load() {
    listEl.innerHTML = `<div class="skeleton" style="height:64px;margin-bottom:8px;"></div>`.repeat(4);
    try {
      const { notifications } = await window.AromaApi.get('/notifications');
      if (!notifications.length) { listEl.innerHTML = emptyState({ icon: 'bell', title: 'No notifications', message: "You're all caught up." }); return; }

      listEl.innerHTML = notifications.map((n) => `
        <div class="list-row" data-id="${n.id}" style="${n.is_read ? '' : 'border-left:3px solid var(--primary-color);'}">
          <div class="list-row-main">
            <strong>${n.title}</strong>
            <span class="text-muted" style="font-size:var(--fs-sm);">${n.message}</span>
            <span class="text-muted" style="font-size:var(--fs-xs);">${new Date(n.created_at).toLocaleString('en-NG')}</span>
          </div>
          <div class="flex gap-2">
            ${!n.is_read ? `<button class="btn btn-ghost btn-sm" data-read="${n.id}">Mark read</button>` : ''}
            <button class="icon-btn" aria-label="Delete" data-del="${n.id}">${AromaIcons.icon('trash', { size: 16 })}</button>
          </div>
        </div>`).join('');
      AromaIcons.hydrateIcons(listEl);

      listEl.querySelectorAll('[data-read]').forEach((btn) => btn.addEventListener('click', async () => {
        await window.AromaApi.patch(`/notifications/${btn.getAttribute('data-read')}/read`); load();
      }));
      listEl.querySelectorAll('[data-del]').forEach((btn) => btn.addEventListener('click', async () => {
        await window.AromaApi.delete(`/notifications/${btn.getAttribute('data-del')}`); load();
      }));
    } catch (err) {
      listEl.innerHTML = emptyState({ icon: 'alertCircle', title: 'Could not load notifications', message: friendlyError(err) });
    }
  }

  document.getElementById('mark-all-btn').addEventListener('click', async () => {
    try { await window.AromaApi.patch('/notifications/read-all'); toast('All marked as read.', 'success'); load(); }
    catch (err) { toast(friendlyError(err), 'error'); }
  });

  load();
});
