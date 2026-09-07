const { supabaseAdmin } = require('../config/supabase');
const { AppError, asyncHandler } = require('../utils/AppError');
const { sendEmail } = require('../services/emailService');
const templates = require('../services/emailTemplates');

const submit = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('contact_messages').insert(req.body).select().single();
  if (error) {
    console.error('[contactController] database error:', error);
    throw new AppError('Could not send your message. Please try again.', 500, 'SUBMIT_FAILED');
  }
  await sendEmail({ to: data.email, subject: "We've received your message — Aroma FoodLand", html: templates.contactAcknowledgement(data) });

  const { data: settings } = await supabaseAdmin.from('restaurant_settings').select('email').eq('id', 1).single();
  if (settings?.email) {
    await sendEmail({
      to: settings.email,
      subject: `New contact message: ${data.subject || 'General inquiry'}`,
      html: templates.adminNewContactAlert(data),
    });
  }

  res.status(201).json({ success: true, message: 'Thanks for reaching out — we will get back to you shortly.' });
});

const list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unread_only } = req.query;
  let query = supabaseAdmin.from('contact_messages').select('*', { count: 'exact' }).order('created_at', { ascending: false });
  if (unread_only === 'true') query = query.eq('is_read', false);
  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error('[contactController] database error:', error);
    throw new AppError('Could not load messages.', 500, 'FETCH_FAILED');
  }
  res.json({ success: true, messages: data, pagination: { page: Number(page), limit: Number(limit), total: count || 0 } });
});

const markRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin.from('contact_messages').update({ is_read: true }).eq('id', id).select().single();
  if (error || !data) throw new AppError('Message not found.', 404, 'NOT_FOUND');
  res.json({ success: true, message: data });
});

module.exports = { submit, list, markRead };