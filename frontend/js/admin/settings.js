window.AdminSections = window.AdminSections || {};
window.AdminSections.settings = {
  async render(panel) {
    const { toast, friendlyError, withButtonLoading } = window.AromaUI;
    const { settings: s } = await window.AromaApi.get('/settings');

    panel.innerHTML = `
      <form id="settings-form" style="max-width:560px;">
        <div class="field"><label for="s_name">Restaurant name</label><input id="s_name" value="${s.name || ''}" required /></div>
        <div class="field"><label for="s_phone">Phone</label><input id="s_phone" value="${s.phone || ''}" required /></div>
        <div class="field"><label for="s_email">Contact email (for admin alerts)</label><input id="s_email" type="email" value="${s.email || ''}" /></div>
        <div class="field"><label for="s_address">Address</label><textarea id="s_address" required>${s.address || ''}</textarea></div>
        <div class="grid grid-2">
          <div class="field"><label for="s_delivery_fee">Delivery fee (₦)</label><input id="s_delivery_fee" type="number" min="0" value="${s.delivery_fee || 0}" /></div>
          <div class="field"><label for="s_minimum_order">Minimum order (₦)</label><input id="s_minimum_order" type="number" min="0" value="${s.minimum_order || 0}" /></div>
        </div>
        <div class="grid grid-2">
          <div class="field"><label for="s_capacity">Default reservation capacity per slot</label><input id="s_capacity" type="number" min="1" value="${s.reservation_capacity_per_slot || 10}" /></div>
          <div class="field"><label for="s_tax">Tax (%)</label><input id="s_tax" type="number" min="0" max="100" value="${s.tax_percent || 0}" /></div>
        </div>
        <button type="submit" class="btn btn-primary" id="settings-submit">Save Settings</button>
      </form>`;

    document.getElementById('settings-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('settings-submit');
      const run = withButtonLoading(btn, async () => {
        try {
          await window.AromaApi.patch('/settings', {
            name: document.getElementById('s_name').value.trim(),
            phone: document.getElementById('s_phone').value.trim(),
            email: document.getElementById('s_email').value.trim() || null,
            address: document.getElementById('s_address').value.trim(),
            delivery_fee: Number(document.getElementById('s_delivery_fee').value),
            minimum_order: Number(document.getElementById('s_minimum_order').value),
            reservation_capacity_per_slot: Number(document.getElementById('s_capacity').value),
            tax_percent: Number(document.getElementById('s_tax').value),
          });
          toast('Settings saved.', 'success');
        } catch (err) { toast(friendlyError(err), 'error'); }
      });
      run();
    });
  },
};
