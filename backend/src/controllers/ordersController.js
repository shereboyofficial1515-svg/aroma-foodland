const { supabaseAdmin } = require('../config/supabase');
const { AppError, asyncHandler } = require('../utils/AppError');
const { createOrder } = require('../services/orderService');
const { notify } = require('../services/notificationService');
const { sendEmail } = require('../services/emailService');
const templates = require('../services/emailTemplates');
const { recordAudit } = require('../services/auditService');

const isStaff = (req) => ['staff', 'manager', 'admin', 'super_admin'].includes(req.user.profile.role);

// ---------------------------------------------------------------------------
// POST /api/v1/orders  — create an order from the caller's current cart
// ---------------------------------------------------------------------------
const checkout = asyncHandler(async (req, res) => {
  const order = await createOrder({
    userId: req.user.id,
    orderType: req.body.order_type,
    customerName: req.body.customer_name,
    customerPhone: req.body.customer_phone,
    customerEmail: req.body.customer_email,
    addressId: req.body.address_id,
    deliveryAddressText: req.body.delivery_address_text,
    specialInstructions: req.body.special_instructions,
    idempotencyKey: req.body.idempotency_key,
  });

  await notify({
    userId: req.user.id,
    type: 'order_placed',
    title: 'Order placed',
    message: `Your order #${order.order_number} has been received.`,
    metadata: { order_id: order.id },
  });

  res.status(201).json({ success: true, order, message: 'Order created. Proceed to payment to confirm it.' });
});

// ---------------------------------------------------------------------------
// GET /api/v1/orders  — "My Orders" for customers, all orders for staff
// ---------------------------------------------------------------------------
const list = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  let query = supabaseAdmin
    .from('orders')
    .select('*, payments(payment_status, paid_at)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (!isStaff(req)) query = query.eq('user_id', req.user.id);
  if (status) query = query.eq('status', status);

  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error('[ordersController] database error:', error);
    throw new AppError('Could not load orders.', 500, 'FETCH_FAILED');
  }

  res.json({ success: true, orders: data, pagination: { page: Number(page), limit: Number(limit), total: count || 0, pages: Math.ceil((count || 0) / limit) } });
});

// ---------------------------------------------------------------------------
// GET /api/v1/orders/:id
// ---------------------------------------------------------------------------
const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*), payments(*), addresses(*)')
    .eq('id', id)
    .single();

  if (error || !order) throw new AppError('Order not found.', 404, 'NOT_FOUND');
  if (order.user_id !== req.user.id && !isStaff(req)) {
    throw new AppError("You don't have permission to view this order.", 403, 'FORBIDDEN');
  }

  res.json({ success: true, order });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/orders/:id/status  (staff+)
// ---------------------------------------------------------------------------
const STATUS_NOTIFICATIONS = {
  confirmed: { type: 'order_confirmed', title: 'Order confirmed' },
  preparing: { type: 'order_preparing', title: 'Your order is being prepared' },
  ready: { type: 'order_ready', title: 'Your order is ready' },
  out_for_delivery: { type: 'order_ready', title: 'Your order is out for delivery' },
  completed: { type: 'order_completed', title: 'Order completed' },
  cancelled: { type: 'order_cancelled', title: 'Order cancelled' },
};

const updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const { data: order, error } = await supabaseAdmin.from('orders').update({ status }).eq('id', id).select().single();
  if (error || !order) throw new AppError('Order not found.', 404, 'NOT_FOUND');

  const notifInfo = STATUS_NOTIFICATIONS[status];
  if (notifInfo) {
    await notify({
      userId: order.user_id,
      type: notifInfo.type,
      title: notifInfo.title,
      message: `Order #${order.order_number} is now ${status.replace('_', ' ')}.`,
      metadata: { order_id: order.id },
    });
  }
  await sendEmail({ to: order.customer_email, subject: `Order Update — #${order.order_number}`, html: templates.orderStatusUpdate(order) });
  await recordAudit({ userId: req.user.id, action: 'order_status_changed', resourceType: 'order', resourceId: id, metadata: { status }, ip: req.ip });

  res.json({ success: true, order });
});

module.exports = { checkout, list, getById, updateStatus };
