const { supabaseAdmin } = require('../config/supabase');
const { AppError, asyncHandler } = require('../utils/AppError');

const list = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('addresses').select('*').eq('user_id', req.user.id).order('is_default', { ascending: false });
  if (error) {
    console.error('[addressesController] database error:', error);
    throw new AppError('Could not load addresses.', 500, 'FETCH_FAILED');
  }
  res.json({ success: true, addresses: data });
});

const create = asyncHandler(async (req, res) => {
  if (req.body.is_default) {
    await supabaseAdmin.from('addresses').update({ is_default: false }).eq('user_id', req.user.id);
  }
  const { data, error } = await supabaseAdmin.from('addresses').insert({ ...req.body, user_id: req.user.id }).select().single();
  if (error) {
    console.error('[addressesController] database error:', error);
    throw new AppError('Could not save address.', 500, 'CREATE_FAILED');
  }
  res.status(201).json({ success: true, address: data });
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data: existing } = await supabaseAdmin.from('addresses').select('user_id').eq('id', id).single();
  if (!existing || existing.user_id !== req.user.id) throw new AppError('Address not found.', 404, 'NOT_FOUND');

  if (req.body.is_default) {
    await supabaseAdmin.from('addresses').update({ is_default: false }).eq('user_id', req.user.id);
  }
  const { data, error } = await supabaseAdmin.from('addresses').update(req.body).eq('id', id).select().single();
  if (error) {
    console.error('[addressesController] database error:', error);
    throw new AppError('Could not update address.', 500, 'UPDATE_FAILED');
  }
  res.json({ success: true, address: data });
});

const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data: existing } = await supabaseAdmin.from('addresses').select('user_id').eq('id', id).single();
  if (!existing || existing.user_id !== req.user.id) throw new AppError('Address not found.', 404, 'NOT_FOUND');

  const { error } = await supabaseAdmin.from('addresses').delete().eq('id', id);
  if (error) {
    console.error('[addressesController] database error:', error);
    throw new AppError('Could not delete address.', 500, 'DELETE_FAILED');
  }
  res.json({ success: true, message: 'Address removed.' });
});

module.exports = { list, create, update, remove };
