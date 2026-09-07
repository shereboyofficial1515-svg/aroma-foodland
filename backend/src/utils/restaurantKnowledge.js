// Static, non-DB knowledge about Aroma FoodLand — the stuff that doesn't
// change per-meal but customers still search/ask about. Kept in one file so
// both the search endpoint (Phase 5) and the AI assistant (Phase 6) draw
// from the same source instead of drifting apart.

const SERVICES = [
  { slug: 'restaurant', name: 'Restaurant', description: 'Dine in at our restaurant in Sapele, Delta State, serving Nigerian and intercontinental dishes.' },
  { slug: 'food-ordering', name: 'Food Ordering', description: 'Order food online for pickup or delivery via our website.' },
  { slug: 'indoor-catering', name: 'Indoor Catering', description: 'Catering for indoor events — weddings, birthdays, corporate functions.' },
  { slug: 'outdoor-catering', name: 'Outdoor Catering', description: 'Catering for outdoor events and gatherings.' },
  { slug: 'bar-lounge', name: 'Bar & Lounge', description: 'Relax at our bar and lounge with a curated drinks menu.' },
  { slug: 'hotel', name: 'Hotel Accommodation', description: 'Comfortable rooms for guests staying in Sapele.' },
  { slug: 'events', name: 'Events', description: 'Host your event with us — weddings, birthdays, private parties, and more.' },
  { slug: 'meetings', name: 'Meeting Facilities', description: 'Meeting space suited for corporate gatherings.' },
  { slug: 'parking', name: 'Parking', description: 'On-site parking available for guests.' },
  { slug: 'reservations', name: 'Table Reservations', description: 'Reserve a table ahead of your visit.' },
];

const FAQS = [
  { question: 'What are your opening hours?', answer: 'We are open 7:00 AM – 9:30 PM, Monday to Sunday.' },
  { question: 'Where are you located?', answer: 'Aroma FoodLand is at 74 Okpe Road, beside Foodland, Sapele, Delta State, Nigeria.' },
  { question: 'How do I order food?', answer: 'Browse the Menu page, add meals to your cart, then check out with delivery, pickup, or dine-in.' },
  { question: 'How do I pay?', answer: 'We accept secure online payment via Paystack (cards, bank transfer, and more).' },
  { question: 'How do I reserve a table?', answer: 'Go to the Reservations page, choose a date, time, and party size, and submit your details.' },
  { question: 'Can I book catering for an event?', answer: 'Yes — use the Catering/Events booking page to tell us your event details and we will follow up.' },
  { question: 'What is your phone number?', answer: 'You can reach us at +234 810 398 0362.' },
];

function searchKnowledge(query) {
  const q = query.toLowerCase();
  const services = SERVICES.filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
  const faqs = FAQS.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
  return { services, faqs };
}

module.exports = { SERVICES, FAQS, searchKnowledge };
