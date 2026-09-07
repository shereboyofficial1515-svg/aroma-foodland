-- ============================================================================
-- AROMA FOODLAND — ROW LEVEL SECURITY POLICIES
-- Run AFTER schema.sql
-- ============================================================================
-- Design principle: the backend's day-to-day reads/writes for admin operations
-- go through the Supabase SERVICE ROLE key (server-side only, bypasses RLS).
-- These policies protect the ANON key path, i.e. anything a browser could
-- theoretically call directly, and any Supabase client-side session (e.g.
-- if the frontend ever queries Supabase directly for public reads).
-- ============================================================================

-- Helper: is the current auth user an admin/manager/staff?
create or replace function is_staff(uid uuid)
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = uid and role in ('staff', 'manager', 'admin', 'super_admin')
  );
$$ language sql stable security definer;

create or replace function is_admin(uid uuid)
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = uid and role in ('admin', 'super_admin')
  );
$$ language sql stable security definer;

-- ============================================================================
-- PROFILES
-- ============================================================================
alter table profiles enable row level security;

create policy "profiles_select_own_or_staff"
  on profiles for select
  using (auth.uid() = id or is_staff(auth.uid()));

create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_insert_own"
  on profiles for insert
  with check (auth.uid() = id);

-- staff can update role/is_active on others; done via service role in practice.

-- ============================================================================
-- ADDRESSES
-- ============================================================================
alter table addresses enable row level security;

create policy "addresses_owner_all"
  on addresses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- MEAL CATEGORIES / MEALS / MEAL IMAGES — public read, staff write
-- ============================================================================
alter table meal_categories enable row level security;
alter table meals enable row level security;
alter table meal_images enable row level security;

create policy "categories_public_read" on meal_categories for select using (true);
create policy "categories_staff_write" on meal_categories for all
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

create policy "meals_public_read" on meals for select using (true);
create policy "meals_staff_write" on meals for all
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

create policy "meal_images_public_read" on meal_images for select using (true);
create policy "meal_images_staff_write" on meal_images for all
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

-- ============================================================================
-- CART — owner only
-- ============================================================================
alter table cart_items enable row level security;

create policy "cart_owner_all"
  on cart_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- ORDERS / ORDER ITEMS — owner read, staff read all; writes go through backend
-- ============================================================================
alter table orders enable row level security;
alter table order_items enable row level security;

create policy "orders_owner_or_staff_read"
  on orders for select
  using (auth.uid() = user_id or is_staff(auth.uid()));

create policy "orders_staff_write"
  on orders for all
  using (is_staff(auth.uid()))
  with check (is_staff(auth.uid()));

create policy "order_items_owner_or_staff_read"
  on order_items for select
  using (
    exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_staff(auth.uid())))
  );

-- Order creation from the client is disabled at the RLS layer; the backend
-- (using the service role key) performs all order writes after validating
-- cart contents, pricing and stock server-side. This prevents price tampering.

-- ============================================================================
-- PAYMENTS — owner/staff read only. All writes are service-role only
-- (Paystack webhook verification happens server-side).
-- ============================================================================
alter table payments enable row level security;

create policy "payments_owner_or_staff_read"
  on payments for select
  using (
    exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_staff(auth.uid())))
  );

-- ============================================================================
-- RESERVATIONS
-- ============================================================================
alter table reservations enable row level security;
alter table reservation_slots enable row level security;

create policy "reservations_owner_or_staff_read"
  on reservations for select
  using (auth.uid() = user_id or is_staff(auth.uid()));

create policy "reservations_owner_insert"
  on reservations for insert
  with check (auth.uid() = user_id or user_id is null);

create policy "reservations_owner_cancel"
  on reservations for update
  using (auth.uid() = user_id or is_staff(auth.uid()))
  with check (auth.uid() = user_id or is_staff(auth.uid()));

create policy "reservation_slots_public_read" on reservation_slots for select using (true);
create policy "reservation_slots_staff_write" on reservation_slots for all
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

-- ============================================================================
-- CATERING / HOTEL BOOKINGS
-- ============================================================================
alter table catering_bookings enable row level security;
alter table hotel_bookings enable row level security;

create policy "catering_owner_or_staff_read"
  on catering_bookings for select
  using (auth.uid() = user_id or is_staff(auth.uid()));
create policy "catering_owner_insert"
  on catering_bookings for insert
  with check (auth.uid() = user_id or user_id is null);
create policy "catering_staff_update"
  on catering_bookings for update
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

create policy "hotel_owner_or_staff_read"
  on hotel_bookings for select
  using (auth.uid() = user_id or is_staff(auth.uid()));
create policy "hotel_owner_insert"
  on hotel_bookings for insert
  with check (auth.uid() = user_id or user_id is null);
create policy "hotel_staff_update"
  on hotel_bookings for update
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

-- ============================================================================
-- REVIEWS
-- ============================================================================
alter table reviews enable row level security;
alter table review_images enable row level security;

create policy "reviews_public_read_approved"
  on reviews for select
  using (is_approved = true and is_hidden = false or auth.uid() = user_id or is_staff(auth.uid()));

create policy "reviews_owner_insert"
  on reviews for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid() and o.status = 'completed')
  );

create policy "reviews_staff_moderate"
  on reviews for update
  using (is_staff(auth.uid()))
  with check (is_staff(auth.uid()));

create policy "review_images_read"
  on review_images for select
  using (
    exists (select 1 from reviews r where r.id = review_id and (r.is_approved = true or r.user_id = auth.uid() or is_staff(auth.uid())))
  );

-- ============================================================================
-- GALLERY — public read, staff write
-- ============================================================================
alter table gallery enable row level security;
create policy "gallery_public_read" on gallery for select using (true);
create policy "gallery_staff_write" on gallery for all
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

-- ============================================================================
-- NOTIFICATIONS — owner only
-- ============================================================================
alter table notifications enable row level security;

create policy "notifications_owner_read"
  on notifications for select
  using (auth.uid() = user_id);

create policy "notifications_owner_update"
  on notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- inserts happen server-side via service role only.

-- ============================================================================
-- PROMOTIONS — public read (active only), staff write
-- ============================================================================
alter table promotions enable row level security;
create policy "promotions_public_read_active"
  on promotions for select
  using (is_active = true and now() between starts_at and coalesce(ends_at, 'infinity'::timestamptz));
create policy "promotions_staff_write" on promotions for all
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

-- ============================================================================
-- CONTACT MESSAGES — insert-only for public, staff read
-- ============================================================================
alter table contact_messages enable row level security;
create policy "contact_insert_anyone" on contact_messages for insert with check (true);
create policy "contact_staff_read" on contact_messages for select using (is_staff(auth.uid()));
create policy "contact_staff_update" on contact_messages for update
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

-- ============================================================================
-- AI CONVERSATIONS / MESSAGES — owner + staff (for moderation)
-- ============================================================================
alter table ai_conversations enable row level security;
alter table ai_messages enable row level security;

create policy "ai_conv_owner_or_staff"
  on ai_conversations for select
  using (auth.uid() = user_id or is_staff(auth.uid()));

create policy "ai_messages_owner_or_staff"
  on ai_messages for select
  using (
    exists (select 1 from ai_conversations c where c.id = conversation_id and (c.user_id = auth.uid() or is_staff(auth.uid())))
  );

-- All AI writes happen server-side (service role) after Gemini responds,
-- so no public insert policy is granted here.

-- ============================================================================
-- RESTAURANT SETTINGS — public read of non-sensitive fields via a view;
-- direct table access restricted to staff.
-- ============================================================================
alter table restaurant_settings enable row level security;

create policy "settings_staff_read" on restaurant_settings for select using (is_staff(auth.uid()));
create policy "settings_admin_write" on restaurant_settings for update
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- Public-safe subset exposed via a view (no AI system prompt / internal config)
create or replace view public_restaurant_info as
  select name, phone, address, opening_hours, delivery_fee, minimum_order, currency
  from restaurant_settings where id = 1;

grant select on public_restaurant_info to anon, authenticated;

-- ============================================================================
-- AUDIT LOGS — admin read only, no client writes
-- ============================================================================
alter table audit_logs enable row level security;
create policy "audit_admin_read" on audit_logs for select using (is_admin(auth.uid()));

-- ============================================================================
-- NOTE ON WRITE POLICIES
-- ============================================================================
-- Tables that intentionally have NO public/customer INSERT or UPDATE policy
-- (orders, order_items, payments, notifications, ai_messages, audit_logs,
-- meal rating fields) are written exclusively by the Express backend using
-- the SUPABASE_SERVICE_ROLE_KEY, after full server-side validation. This is
-- the key defense against price tampering, fake payments and forged orders.
