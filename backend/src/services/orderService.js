const { supabaseAdmin } = require('../config/supabase');
const { AppError } = require('../utils/AppError');

function generateOrderNumber() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `AFL-${y}${m}${d}-${rand}`;
}

// Builds the authoritative order line items and totals from the DB, never
// from client-supplied prices. This is the single most important function
// for preventing price tampering (spec section 12/56: "never trust
// frontend payment confirmation" extends to never trusting frontend prices).
async function priceCartForCheckout(userId) {
  const { data: items, error } = await supabaseAdmin
    .from('cart_items')
    .select('id, quantity, special_instructions, meals(id, name, price, discount_price, availability, stock)')
    .eq('user_id', userId);

  if (error) throw new AppError('Could not read your cart.', 500, 'CART_READ_FAILED');
  if (!items || items.length === 0) throw new AppError('Your cart is empty.', 400, 'EMPTY_CART');

  const lineItems = [];
  let subtotal = 0;

  for (const item of items) {
    const meal = item.meals;
    if (!meal) throw new AppError('One of the meals in your cart no longer exists.', 400, 'MEAL_REMOVED');
    if (!meal.availability) throw new AppError(`"${meal.name}" is currently unavailable. Please remove it from your cart.`, 400, 'MEAL_UNAVAILABLE');
    if (meal.stock !== null && meal.stock < item.quantity) {
      throw new AppError(`Only ${meal.stock} of "${meal.name}" left in stock.`, 400, 'INSUFFICIENT_STOCK');
    }
    const unitPrice = Number(meal.discount_price ?? meal.price);
    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;
    lineItems.push({
      meal_id: meal.id,
      meal_name: meal.name,
      unit_price: unitPrice,
      quantity: item.quantity,
      special_instructions: item.special_instructions,
      line_total: lineTotal,
    });
  }

  return { lineItems, subtotal };
}

async function getSettings() {
  const { data } = await supabaseAdmin.from('restaurant_settings').select('*').eq('id', 1).single();
  return data;
}

// Creates the order + order_items atomically-ish: order first, then items;
// if items fail to insert we roll the order back so we never leave a
// dangling empty order. Also decrements stock for meals that track it.
async function createOrder({ userId, orderType, customerName, customerPhone, customerEmail, addressId, deliveryAddressText, specialInstructions, idempotencyKey }) {
  const { lineItems, subtotal } = await priceCartForCheckout(userId);
  const settings = await getSettings();

  const deliveryFee = orderType === 'delivery' ? Number(settings?.delivery_fee || 0) : 0;
  const total = subtotal + deliveryFee;

  if (settings?.minimum_order && subtotal < Number(settings.minimum_order)) {
    throw new AppError(`Minimum order amount is ₦${Number(settings.minimum_order).toLocaleString()}.`, 400, 'BELOW_MINIMUM_ORDER');
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      order_number: generateOrderNumber(),
      user_id: userId,
      order_type: orderType,
      status: 'pending',
      address_id: addressId || null,
      delivery_address_text: deliveryAddressText || null,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      subtotal,
      delivery_fee: deliveryFee,
      total,
      special_instructions: specialInstructions || null,
      idempotency_key: idempotencyKey,
    })
    .select()
    .single();

  if (orderError) {
    if (orderError.code === '23505') {
      // Duplicate idempotency_key — the client retried a submit. Return the
      // existing order instead of erroring, so a double-click never double-charges.
      const { data: existing } = await supabaseAdmin.from('orders').select('*').eq('idempotency_key', idempotencyKey).single();
      if (existing) return existing;
    }
    throw new AppError('Could not create your order. Please try again.', 500, 'ORDER_CREATE_FAILED');
  }

  const itemRows = lineItems.map((li) => ({ ...li, order_id: order.id }));
  const { error: itemsError } = await supabaseAdmin.from('order_items').insert(itemRows);

  if (itemsError) {
    await supabaseAdmin.from('orders').delete().eq('id', order.id);
    throw new AppError('Could not create your order. Please try again.', 500, 'ORDER_ITEMS_FAILED');
  }

  // Decrement stock for meals that track it (stock is nullable = unlimited).
  for (const li of lineItems) {
    // eslint-disable-next-line no-await-in-loop
    try {
      await supabaseAdmin.rpc('decrement_meal_stock', { p_meal_id: li.meal_id, p_qty: li.quantity });
    } catch (err) {
      console.error('[orderService] stock decrement failed for meal', li.meal_id, err);
    }
  }

  // Clear the cart now that it has become an order.
  await supabaseAdmin.from('cart_items').delete().eq('user_id', userId);

  return order;
}

module.exports = { generateOrderNumber, priceCartForCheckout, createOrder, getSettings };
