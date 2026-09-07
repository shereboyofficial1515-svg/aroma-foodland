const { supabaseAdmin } = require('../config/supabase');
const { AppError, asyncHandler } = require('../utils/AppError');

// Returns the cart with each line re-priced from the current meals table —
// the cart never trusts a stored/stale price, so it always reflects reality
// (price changes, meals going unavailable, discounts starting/ending).
const getCart = asyncHandler(async (req, res) => {
  const { data: items, error } = await supabaseAdmin
    .from('cart_items')
    .select('id, quantity, special_instructions, created_at, meals(id, name, slug, price, discount_price, primary_image_url, availability, stock)')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[cartController] database error:', error);
    throw new AppError('Could not load your cart.', 500, 'FETCH_FAILED');
  }

  let subtotal = 0;
  const cart = items.map((item) => {
    const meal = item.meals;
    const unitPrice = meal ? Number(meal.discount_price ?? meal.price) : 0;
    const lineTotal = unitPrice * item.quantity;
    const unavailable = !meal || !meal.availability || (meal.stock !== null && meal.stock < item.quantity);
    if (!unavailable) subtotal += lineTotal;
    return {
      id: item.id,
      quantity: item.quantity,
      special_instructions: item.special_instructions,
      meal,
      unit_price: unitPrice,
      line_total: lineTotal,
      unavailable,
    };
  });

  res.json({ success: true, cart, subtotal });
});

const addItem = asyncHandler(async (req, res) => {
  const { meal_id, quantity, special_instructions } = req.body;

  const { data: meal } = await supabaseAdmin.from('meals').select('id, availability, stock').eq('id', meal_id).single();
  if (!meal) throw new AppError('This meal could not be found.', 404, 'NOT_FOUND');
  if (!meal.availability) throw new AppError('This meal is currently unavailable.', 400, 'MEAL_UNAVAILABLE');
  if (meal.stock !== null && meal.stock < quantity) {
    throw new AppError(`Only ${meal.stock} left in stock.`, 400, 'INSUFFICIENT_STOCK');
  }

  // Upsert: adding an already-in-cart meal increases its quantity instead
  // of creating a duplicate row (unique(user_id, meal_id) in schema).
  const { data: existing } = await supabaseAdmin
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', req.user.id)
    .eq('meal_id', meal_id)
    .maybeSingle();

  let result;
  if (existing) {
    const newQty = Math.min(existing.quantity + quantity, 50);
    ({ data: result } = await supabaseAdmin
      .from('cart_items')
      .update({ quantity: newQty, special_instructions: special_instructions ?? undefined })
      .eq('id', existing.id)
      .select()
      .single());
  } else {
    ({ data: result } = await supabaseAdmin
      .from('cart_items')
      .insert({ user_id: req.user.id, meal_id, quantity, special_instructions })
      .select()
      .single());
  }

  res.status(201).json({ success: true, item: result });
});

const updateItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { quantity, special_instructions } = req.body;

  const { data: item } = await supabaseAdmin.from('cart_items').select('*, meals(stock)').eq('id', itemId).eq('user_id', req.user.id).single();
  if (!item) throw new AppError('Cart item not found.', 404, 'NOT_FOUND');

  if (quantity !== undefined && item.meals?.stock !== null && item.meals?.stock < quantity) {
    throw new AppError(`Only ${item.meals.stock} left in stock.`, 400, 'INSUFFICIENT_STOCK');
  }

  const { data, error } = await supabaseAdmin
    .from('cart_items')
    .update({ ...(quantity !== undefined && { quantity }), ...(special_instructions !== undefined && { special_instructions }) })
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    console.error('[cartController] database error:', error);
    throw new AppError('Could not update cart item.', 500, 'UPDATE_FAILED');
  }
  res.json({ success: true, item: data });
});

const removeItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { error } = await supabaseAdmin.from('cart_items').delete().eq('id', itemId).eq('user_id', req.user.id);
  if (error) {
    console.error('[cartController] database error:', error);
    throw new AppError('Could not remove item.', 500, 'DELETE_FAILED');
  }
  res.json({ success: true, message: 'Item removed from cart.' });
});

const clearCart = asyncHandler(async (req, res) => {
  const { error } = await supabaseAdmin.from('cart_items').delete().eq('user_id', req.user.id);
  if (error) {
    console.error('[cartController] database error:', error);
    throw new AppError('Could not clear cart.', 500, 'DELETE_FAILED');
  }
  res.json({ success: true, message: 'Cart cleared.' });
});

module.exports = { getCart, addItem, updateItem, removeItem, clearCart };
