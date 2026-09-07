-- ============================================================================
-- AROMA FOODLAND — SEED DATA
-- Run AFTER schema.sql and policies.sql. Safe to re-run (uses upserts where
-- practical). Intended for development/demo, not production.
-- ============================================================================

-- Reservation slots (30-minute intervals, 7:00 AM – 9:00 PM last seating)
insert into reservation_slots (slot_time, max_capacity) values
  ('07:00', 10), ('07:30', 10), ('08:00', 10), ('08:30', 10),
  ('09:00', 12), ('09:30', 12), ('10:00', 12), ('10:30', 12),
  ('11:00', 15), ('11:30', 15), ('12:00', 20), ('12:30', 20),
  ('13:00', 20), ('13:30', 20), ('14:00', 15), ('14:30', 15),
  ('15:00', 12), ('15:30', 12), ('16:00', 12), ('16:30', 12),
  ('17:00', 15), ('17:30', 15), ('18:00', 20), ('18:30', 20),
  ('19:00', 20), ('19:30', 20), ('20:00', 15), ('20:30', 15),
  ('21:00', 10)
on conflict (slot_time) do nothing;

-- Meal categories
insert into meal_categories (name, slug, display_order) values
  ('Rice Dishes', 'rice-dishes', 1),
  ('Swallow', 'swallow', 2),
  ('Soups', 'soups', 3),
  ('Chicken', 'chicken', 4),
  ('Turkey', 'turkey', 5),
  ('Beef', 'beef', 6),
  ('Fish', 'fish', 7),
  ('Local Nigerian Dishes', 'local-nigerian', 8),
  ('Intercontinental', 'intercontinental', 9),
  ('Burgers', 'burgers', 10),
  ('Fries', 'fries', 11),
  ('Pastries', 'pastries', 12),
  ('Drinks', 'drinks', 13),
  ('Desserts', 'desserts', 14),
  ('Special Offers', 'special-offers', 15)
on conflict (slug) do nothing;

-- Sample meals (image URLs point to placeholder assets; replace via admin upload)
insert into meals (name, slug, description, category_id, price, discount_price, availability, stock, preparation_time_minutes, ingredients, allergens, spice_level, is_featured, is_popular)
select
  m.name, m.slug, m.description,
  (select id from meal_categories where slug = m.category_slug),
  m.price, m.discount_price, true, m.stock, m.prep, m.ingredients, m.allergens, m.spice, m.featured, m.popular
from (values
  ('Jollof Rice & Chicken', 'jollof-rice-chicken', 'Smoky party-style jollof rice served with grilled chicken.', 'rice-dishes', 4500.00, 3999.00, 50, 20, array['Rice','Tomato','Pepper','Chicken'], array['None'], 1, true, true),
  ('Fried Rice & Turkey', 'fried-rice-turkey', 'Vegetable fried rice with a crispy turkey portion.', 'rice-dishes', 4800.00, null, 40, 20, array['Rice','Mixed Vegetables','Turkey'], array['None'], 0, false, true),
  ('Pounded Yam & Egusi Soup', 'pounded-yam-egusi', 'Smooth pounded yam with rich melon-seed soup and assorted meat.', 'swallow', 5200.00, null, 30, 25, array['Yam','Melon Seeds','Assorted Meat'], array['None'], 1, true, false),
  ('Semovita & Afang Soup', 'semovita-afang', 'Soft semovita paired with vegetable-rich Afang soup.', 'swallow', 5000.00, null, 25, 25, array['Semovita','Afang Leaves','Waterleaf'], array['None'], 1, false, false),
  ('Peppered Chicken', 'peppered-chicken', 'Grilled chicken tossed in a spicy pepper sauce.', 'chicken', 4200.00, null, 40, 18, array['Chicken','Bell Pepper','Onion'], array['None'], 2, false, true),
  ('Grilled Turkey', 'grilled-turkey', 'Chargrilled turkey seasoned with house spices.', 'turkey', 5500.00, null, 20, 22, array['Turkey','Spices'], array['None'], 1, false, false),
  ('Beef Suya Platter', 'beef-suya-platter', 'Skewered spicy beef suya with onions and yaji spice.', 'beef', 3800.00, null, 35, 15, array['Beef','Yaji Spice','Onion'], array['Peanut'], 2, true, true),
  ('Grilled Fish (Croaker)', 'grilled-croaker', 'Whole grilled croaker fish with pepper sauce.', 'fish', 6000.00, 5499.00, 20, 25, array['Croaker Fish','Pepper','Spices'], array['Fish'], 1, false, false),
  ('Classic Beef Burger', 'classic-beef-burger', 'Juicy beef patty, cheese, lettuce and house sauce.', 'burgers', 3500.00, null, 40, 15, array['Beef Patty','Bun','Cheese','Lettuce'], array['Gluten','Dairy'], 0, false, false),
  ('Golden Fries', 'golden-fries', 'Crispy seasoned potato fries.', 'fries', 1800.00, null, 60, 10, array['Potato','Salt','Seasoning'], array['None'], 0, false, true),
  ('Meat Pie', 'meat-pie', 'Flaky pastry filled with seasoned minced meat and vegetables.', 'pastries', 1200.00, null, 50, 5, array['Flour','Minced Meat','Vegetables'], array['Gluten'], 0, false, false),
  ('Chapman', 'chapman', 'Refreshing Nigerian mocktail with citrus and grenadine.', 'drinks', 2000.00, null, 100, 5, array['Fanta','Sprite','Grenadine','Cucumber'], array['None'], 0, false, false),
  ('Chocolate Cake Slice', 'chocolate-cake-slice', 'Rich chocolate layer cake slice.', 'desserts', 2200.00, null, 30, 5, array['Flour','Cocoa','Sugar'], array['Gluten','Dairy','Egg'], 0, false, false)
) as m(name, slug, description, category_slug, price, discount_price, stock, prep, ingredients, allergens, spice, featured, popular)
on conflict (slug) do nothing;

-- Gallery placeholders
insert into gallery (image_url, category, caption, is_featured, display_order) values
  ('/assets/placeholders/restaurant-interior.svg', 'interior', 'Our dining hall', true, 1),
  ('/assets/placeholders/restaurant-exterior.svg', 'exterior', 'Aroma FoodLand, Sapele', true, 2),
  ('/assets/placeholders/food-spread.svg', 'food', 'A taste of Aroma FoodLand', true, 3),
  ('/assets/placeholders/event-setup.svg', 'events', 'Event hall setup', false, 4),
  ('/assets/placeholders/hotel-room.svg', 'hotel', 'Guest room', false, 5)
on conflict do nothing;

-- Restaurant settings AI prompt (kept out of schema.sql default so it's easy to tweak)
update restaurant_settings set
  ai_system_prompt = 'You are the official Aroma FoodLand customer assistant for a restaurant located at 74 Okpe Road, beside Foodland, Sapele, Delta State, Nigeria. You provide accurate, friendly and concise information about Aroma FoodLand''s menu, prices, availability, services (restaurant, bar & lounge, hotel, catering, events, meetings, parking), opening hours (7:00 AM - 9:30 PM daily), reservations, ordering and payment. Never invent prices, availability, reservation slots, order status or policies -- only state facts provided to you in this conversation''s context. If you do not have the information, say so plainly and offer to connect the customer with staff. Never request or reveal passwords, API keys, card numbers, PINs or other sensitive payment information.'
where id = 1;

-- NOTE: profiles are created automatically by the backend's auth signup flow
-- (a profiles row is inserted right after auth.users is created). To make
-- your own account a super_admin after registering normally, run:
--   update profiles set role = 'super_admin' where id = '<your-auth-user-uuid>';
