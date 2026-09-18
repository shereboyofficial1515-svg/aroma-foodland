// Restaurant knowledge shared by the AI assistant and search.
//
// Services now come from the live `services` database table (managed from
// Admin -> Services) instead of a hardcoded list, so an admin editing a
// service is instantly reflected in both search results and what the AI
// assistant tells customers — no code change or redeploy needed.
//
// FAQs remain static here since they're genuinely fixed policy/how-to
// content rather than something that needs day-to-day editing.

const { supabaseAdmin } = require('../config/supabase');

const FAQS = [
  { question: 'What are your opening hours?', answer: 'We are open 7:00 AM – 9:30 PM, Monday to Sunday.' },
  { question: 'Where are you located?', answer: 'Aroma FoodLand is at 74 Okpe Road, beside Foodland, Sapele, Delta State, Nigeria.' },
  { question: 'How do I order food?', answer: 'Browse the Menu page, add meals to your cart, then check out with delivery, pickup, or dine-in.' },
  { question: 'How do I pay?', answer: 'We accept secure online payment via Paystack (cards, bank transfer, and more).' },
  { question: 'How do I reserve a table?', answer: 'Go to the Reservations page, choose a date, time, and party size, and submit your details.' },
  { question: 'Can I book catering for an event?', answer: 'Yes — use the Catering/Events booking page to tell us your event details and we will follow up.' },
  { question: 'What is your phone number?', answer: 'You can reach us at +234 810 398 0362.' },
];

async function getActiveServices() {
  const { data, error } = await supabaseAdmin
    .from('services')
    .select('name, slug, description, price')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  if (error) {
    console.error('[restaurantKnowledge] failed to load services:', error);
    return [];
  }
  return data || [];
}

async function searchKnowledge(query) {
  const q = query.toLowerCase();
  const services = await getActiveServices();
  const matchedServices = services.filter((s) => s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q));
  const faqs = FAQS.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
  return { services: matchedServices, faqs };
}

module.exports = { FAQS, getActiveServices, searchKnowledge };