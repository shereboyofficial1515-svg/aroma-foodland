const { supabaseAdmin } = require('../config/supabase');
const { AppError, asyncHandler } = require('../utils/AppError');
const { generateReply } = require('../services/geminiService');
const { recordAudit } = require('../services/auditService');

// ---------------------------------------------------------------------------
// GET /api/v1/ai/welcome — used by the frontend to initialize the chat widget
// ---------------------------------------------------------------------------
const welcome = asyncHandler(async (req, res) => {
  const { data: settings } = await supabaseAdmin.from('restaurant_settings').select('ai_enabled, ai_welcome_message').eq('id', 1).single();
  res.json({
    success: true,
    enabled: settings?.ai_enabled !== false,
    welcome_message: settings?.ai_welcome_message || "Hi! I'm the Aroma FoodLand assistant. Ask me about our menu, hours, reservations or catering.",
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/ai/chat  { session_id, message }
// Works for both guests and logged-in users (optionalAuth). We deliberately
// never forward the user's account details, order history, or any PII to
// Gemini — only the message text and live menu/restaurant facts.
// ---------------------------------------------------------------------------
const chat = asyncHandler(async (req, res) => {
  const { session_id, message } = req.body;

  let { data: conversation } = await supabaseAdmin.from('ai_conversations').select('*').eq('session_id', session_id).maybeSingle();

  if (!conversation) {
    const { data: created, error } = await supabaseAdmin
      .from('ai_conversations')
      .insert({ session_id, user_id: req.user?.id || null })
      .select()
      .single();
    if (error) {
      console.error('[ai.chat] conversation insert failed:', error);
      throw new AppError('Could not start a conversation with the assistant.', 500, 'AI_CONV_CREATE_FAILED');
    }
    conversation = created;
  } else if (req.user && !conversation.user_id) {
    // A guest session that later logs in — attach it to their account.
    await supabaseAdmin.from('ai_conversations').update({ user_id: req.user.id }).eq('id', conversation.id);
  }

  const { data: priorMessages } = await supabaseAdmin
    .from('ai_messages')
    .select('role, content')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: true })
    .limit(20);

  await supabaseAdmin.from('ai_messages').insert({ conversation_id: conversation.id, role: 'user', content: message });

  const result = await generateReply({ message, history: priorMessages || [] });

  await supabaseAdmin.from('ai_messages').insert({ conversation_id: conversation.id, role: 'assistant', content: result.reply });
  await supabaseAdmin.from('ai_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation.id);

  res.json({ success: true, reply: result.reply, session_id });
});

// ---------------------------------------------------------------------------
// GET /api/v1/ai/settings  (staff+)
// ---------------------------------------------------------------------------
const getSettings = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('restaurant_settings').select('ai_enabled, ai_system_prompt, ai_welcome_message').eq('id', 1).single();
  if (error) {
    console.error('[aiController] database error:', error);
    throw new AppError('Could not load AI settings.', 500, 'FETCH_FAILED');
  }
  res.json({ success: true, settings: data });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/ai/settings  (admin+) — enable/disable, edit instructions,
// edit welcome message. API keys are never part of this payload — they only
// ever live in the backend's .env, never in this table or the frontend.
// ---------------------------------------------------------------------------
const updateSettings = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('restaurant_settings').update(req.body).eq('id', 1).select().single();
  if (error) {
    console.error('[aiController] database error:', error);
    throw new AppError('Could not update AI settings.', 500, 'UPDATE_FAILED');
  }

  await recordAudit({ userId: req.user.id, action: 'ai_settings_updated', resourceType: 'restaurant_settings', metadata: req.body, ip: req.ip });
  res.json({ success: true, settings: data });
});

// ---------------------------------------------------------------------------
// GET /api/v1/ai/conversations  (staff+) — for reviewing AI conversations
// ---------------------------------------------------------------------------
const listConversations = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const from = (page - 1) * limit;

  const { data, error, count } = await supabaseAdmin
    .from('ai_conversations')
    .select('*, profiles(full_name, phone)', { count: 'exact' })
    .order('last_message_at', { ascending: false })
    .range(from, from + limit - 1);

  if (error) {
    console.error('[aiController] database error:', error);
    throw new AppError('Could not load conversations.', 500, 'FETCH_FAILED');
  }
  res.json({ success: true, conversations: data, pagination: { page: Number(page), limit: Number(limit), total: count || 0 } });
});

const getConversation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data: conversation, error } = await supabaseAdmin.from('ai_conversations').select('*').eq('id', id).single();
  if (error || !conversation) throw new AppError('Conversation not found.', 404, 'NOT_FOUND');

  const { data: messages } = await supabaseAdmin.from('ai_messages').select('*').eq('conversation_id', id).order('created_at', { ascending: true });
  res.json({ success: true, conversation, messages: messages || [] });
});

module.exports = { welcome, chat, getSettings, updateSettings, listConversations, getConversation };
