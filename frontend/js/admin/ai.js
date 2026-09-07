window.AdminSections = window.AdminSections || {};
window.AdminSections.ai = {
  async render(panel) {
    const { toast, friendlyError, withButtonLoading } = window.AromaUI;
    const { settings } = await window.AromaApi.get('/ai/settings');
    const { conversations } = await window.AromaApi.get('/ai/conversations').catch(() => ({ conversations: [] }));

    panel.innerHTML = `
      <form id="ai-settings-form" style="max-width:560px; margin-bottom:var(--space-8);">
        <label style="display:flex;align-items:center;gap:8px;margin-bottom:var(--space-4);"><input type="checkbox" id="ai_enabled" style="width:auto;" ${settings.ai_enabled !== false ? 'checked' : ''} /> AI Assistant enabled</label>
        <div class="field"><label for="ai_welcome_message">Welcome message</label><input type="text" id="ai_welcome_message" value="${settings.ai_welcome_message || ''}" /></div>
        <div class="field"><label for="ai_system_prompt">System instructions</label><textarea id="ai_system_prompt" rows="6">${settings.ai_system_prompt || ''}</textarea></div>
        <button type="submit" class="btn btn-primary" id="ai-settings-submit">Save AI Settings</button>
      </form>

      <h3>Recent Conversations</h3>
      <table class="admin-table" style="margin-top:12px;">
        <thead><tr><th>User</th><th>Last message</th></tr></thead>
        <tbody>${conversations.map((c) => `<tr><td>${c.profiles?.full_name || 'Guest'}</td><td>${new Date(c.last_message_at).toLocaleString('en-NG')}</td></tr>`).join('') || '<tr><td colspan="2">No conversations yet</td></tr>'}</tbody>
      </table>`;

    document.getElementById('ai-settings-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('ai-settings-submit');
      const run = withButtonLoading(btn, async () => {
        try {
          await window.AromaApi.patch('/ai/settings', {
            ai_enabled: document.getElementById('ai_enabled').checked,
            ai_welcome_message: document.getElementById('ai_welcome_message').value,
            ai_system_prompt: document.getElementById('ai_system_prompt').value,
          });
          toast('AI settings saved.', 'success');
        } catch (err) { toast(friendlyError(err), 'error'); }
      });
      run();
    });
  },
};
