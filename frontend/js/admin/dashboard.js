window.AdminSections = window.AdminSections || {};
window.AdminSections.dashboard = {
  async render(panel) {
    const { formatNaira } = window.AromaRender;
    const { dashboard: d } = await window.AromaApi.get('/admin/dashboard');

    panel.innerHTML = `
      <div class="stat-cards">
        <div class="stat-card"><div class="stat-value">${formatNaira(d.today_sales)}</div><div class="stat-label">Today's Sales</div></div>
        <div class="stat-card"><div class="stat-value">${d.orders_today}</div><div class="stat-label">Orders Today</div></div>
        <div class="stat-card"><div class="stat-value">${d.pending_orders}</div><div class="stat-label">Pending Orders</div></div>
        <div class="stat-card"><div class="stat-value">${d.reservations_today}</div><div class="stat-label">Reservations Today</div></div>
        <div class="stat-card"><div class="stat-value">${formatNaira(d.week_sales)}</div><div class="stat-label">This Week</div></div>
        <div class="stat-card"><div class="stat-value">${formatNaira(d.month_sales)}</div><div class="stat-label">This Month</div></div>
        <div class="stat-card"><div class="stat-value">${d.total_customers}</div><div class="stat-label">Total Customers</div></div>
        <div class="stat-card"><div class="stat-value">${d.pending_reservations}</div><div class="stat-label">Pending Reservations</div></div>
      </div>

      <div class="grid grid-2" style="align-items:flex-start;">
        <div>
          <h3>Recent Orders</h3>
          <table class="admin-table" style="margin-top:12px;">
            <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>${d.recent_orders.map((o) => `<tr><td>#${o.order_number}</td><td>${o.customer_name}</td><td>${formatNaira(o.total)}</td><td><span class="badge badge-accent">${o.status}</span></td></tr>`).join('') || '<tr><td colspan="4">No orders yet</td></tr>'}</tbody>
          </table>
        </div>
        <div>
          <h3>Popular Meals</h3>
          <table class="admin-table" style="margin-top:12px;">
            <thead><tr><th>Meal</th><th>Rating</th><th>Reviews</th></tr></thead>
            <tbody>${d.popular_meals.map((m) => `<tr><td>${m.name}</td><td>${Number(m.rating_avg).toFixed(1)}</td><td>${m.rating_count}</td></tr>`).join('') || '<tr><td colspan="3">No data yet</td></tr>'}</tbody>
          </table>
        </div>
      </div>

      <div style="margin-top:var(--space-6);">
        <h3>Recent Reviews</h3>
        <table class="admin-table" style="margin-top:12px;">
          <thead><tr><th>Customer</th><th>Rating</th><th>Comment</th><th>Status</th></tr></thead>
          <tbody>${d.recent_reviews.map((r) => `<tr><td>${r.profiles?.full_name || 'Guest'}</td><td>${r.rating}★</td><td>${(r.comment || '').slice(0, 60)}</td><td>${r.is_approved ? '<span class="badge badge-success">Approved</span>' : '<span class="badge badge-warning">Pending</span>'}</td></tr>`).join('') || '<tr><td colspan="4">No reviews yet</td></tr>'}</tbody>
        </table>
      </div>`;
  },
};
