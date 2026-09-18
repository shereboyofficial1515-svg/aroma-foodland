-- ============================================================================
-- AROMA FOODLAND — DATABASE SCHEMA
-- Supabase PostgreSQL
-- ============================================================================
-- Run this in the Supabase SQL editor (or via `supabase db push`) AFTER
-- creating a new project. Run policies.sql immediately after this file.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

create type user_role as enum ('customer', 'staff', 'manager', 'admin', 'super_admin');

create type order_status as enum (
  'pending', 'confirmed', 'preparing', 'ready',
  'out_for_delivery', 'completed', 'cancelled', 'refunded'
);

create type order_type as enum ('dine_in', 'pickup', 'delivery');

create type payment_status as enum ('pending', 'paid', 'failed', 'refunded');

create type reservation_status as enum (
  'pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'
);

create type booking_status as enum ('pending', 'approved', 'rejected', 'completed', 'cancelled');

create type notification_type as enum (
  'order_placed', 'payment_successful', 'order_confirmed', 'order_preparing',
  'order_ready', 'order_completed', 'order_cancelled',
  'reservation_confirmed', 'reservation_reminder', 'reservation_cancelled',
  'booking_update', 'promotion', 'security'
);

-- ============================================================================
-- PROFILES  (extends auth.users — Supabase manages auth.users itself)
-- ============================================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  avatar_url text,
  role user_role not null default 'customer',
  is_active boolean not null default true,
  email_verified boolean not null default false,
  notification_prefs jsonb not null default '{"email": true, "push": true, "promotions": true}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_role on profiles(role);

-- ============================================================================
-- ADDRESSES
-- ============================================================================

create table addresses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  label text default 'Home',
  street text not null,
  city text not null,
  state text not null default 'Delta State',
  landmark text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_addresses_user on addresses(user_id);

-- ============================================================================
-- MEAL CATEGORIES & MEALS
-- ============================================================================

create table meal_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  slug text not null unique,
  description text,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table meals (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  category_id uuid references meal_categories(id) on delete set null,
  price numeric(10,2) not null check (price >= 0),
  discount_price numeric(10,2) check (discount_price >= 0),
  primary_image_url text,
  availability boolean not null default true,
  stock int,
  preparation_time_minutes int default 20,
  ingredients text[],
  allergens text[],
  spice_level smallint default 0 check (spice_level between 0 and 3),
  portion_info text,
  is_featured boolean not null default false,
  is_popular boolean not null default false,
  is_new boolean not null default false,
  is_recommended boolean not null default false,
  rating_avg numeric(3,2) not null default 0,
  rating_count int not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_meals_category on meals(category_id);
create index idx_meals_availability on meals(availability);
create index idx_meals_featured on meals(is_featured) where is_featured = true;
create index idx_meals_popular on meals(is_popular) where is_popular = true;
create index idx_meals_new on meals(is_new) where is_new = true;
create index idx_meals_recommended on meals(is_recommended) where is_recommended = true;
create index idx_meals_name_search on meals using gin (to_tsvector('english', name || ' ' || coalesce(description, '')));

create table meal_images (
  id uuid primary key default uuid_generate_v4(),
  meal_id uuid not null references meals(id) on delete cascade,
  image_url text not null,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_meal_images_meal on meal_images(meal_id);

-- ============================================================================
-- CART
-- ============================================================================

create table cart_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  meal_id uuid not null references meals(id) on delete cascade,
  quantity int not null default 1 check (quantity > 0),
  special_instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, meal_id)
);

create index idx_cart_user on cart_items(user_id);

-- ============================================================================
-- ORDERS
-- ============================================================================

create table orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text not null unique,
  user_id uuid not null references profiles(id),
  order_type order_type not null,
  status order_status not null default 'pending',
  address_id uuid references addresses(id),
  delivery_address_text text,
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  subtotal numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  special_instructions text,
  idempotency_key text unique, -- prevents duplicate order creation on double-submit
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_orders_user on orders(user_id);
create index idx_orders_status on orders(status);
create index idx_orders_created on orders(created_at desc);

create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  meal_id uuid references meals(id) on delete set null,
  meal_name text not null,        -- snapshot, survives meal edits/deletes
  unit_price numeric(10,2) not null,
  quantity int not null check (quantity > 0),
  special_instructions text,
  line_total numeric(10,2) not null
);

create index idx_order_items_order on order_items(order_id);

-- ============================================================================
-- PAYMENTS  (Paystack)
-- ============================================================================

create table payments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  payment_reference text not null unique,   -- our generated reference sent to Paystack
  transaction_id text,                       -- Paystack's transaction id, set on verify
  amount numeric(10,2) not null,
  currency text not null default 'NGN',
  payment_status payment_status not null default 'pending',
  payment_method text,
  paid_at timestamptz,
  raw_webhook_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_payments_order on payments(order_id);
create index idx_payments_status on payments(payment_status);

-- ============================================================================
-- RESERVATIONS (table bookings)
-- ============================================================================

create table reservation_slots (
  id uuid primary key default uuid_generate_v4(),
  slot_time time not null unique,
  max_capacity int not null default 10,
  is_active boolean not null default true
);

create table reservations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id),
  reservation_date date not null,
  reservation_time time not null,
  guests int not null check (guests > 0),
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  special_request text,
  status reservation_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_reservations_date_time on reservations(reservation_date, reservation_time);
create index idx_reservations_user on reservations(user_id);
create index idx_reservations_status on reservations(status);

-- ============================================================================
-- CATERING / EVENT BOOKINGS
-- ============================================================================

create table catering_bookings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id),
  event_type text not null,          -- wedding, birthday, meeting, corporate, private, outdoor, indoor
  event_date date not null,
  guests int not null check (guests > 0),
  location text not null,
  budget numeric(12,2),
  services_required text[],
  additional_info text,
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  status booking_status not null default 'pending',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_catering_status on catering_bookings(status);

create table hotel_bookings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id),
  check_in date not null,
  check_out date not null,
  guests int not null check (guests > 0),
  room_type text,
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  additional_info text,
  status booking_status not null default 'pending',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- REVIEWS
-- ============================================================================

create table reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  order_id uuid references orders(id),
  meal_id uuid references meals(id),
  rating smallint not null check (rating between 1 and 5),
  comment text,
  is_approved boolean not null default false,
  is_hidden boolean not null default false,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  -- one review per completed order, prevents review spam
  unique (user_id, order_id)
);

create index idx_reviews_meal on reviews(meal_id);
create index idx_reviews_approved on reviews(is_approved) where is_approved = true;

create table review_images (
  id uuid primary key default uuid_generate_v4(),
  review_id uuid not null references reviews(id) on delete cascade,
  image_url text not null
);

-- ============================================================================
-- GALLERY
-- ============================================================================

create table gallery (
  id uuid primary key default uuid_generate_v4(),
  image_url text not null,
  category text default 'general',   -- interior, exterior, food, events, hotel
  caption text,
  is_featured boolean not null default false,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade, -- null = broadcast/admin-created for a segment
  type notification_type not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on notifications(user_id, is_read);

-- ============================================================================
-- PROMOTIONS / ANNOUNCEMENTS
-- ============================================================================

create table promotions (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  message text not null,
  target_audience text not null default 'all', -- all, customers, staff, selected
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- CONTACT MESSAGES
-- ============================================================================

create table contact_messages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- AI ASSISTANT
-- ============================================================================

create table ai_conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete set null, -- null = anonymous/guest session
  session_id text not null,
  started_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index idx_ai_conversations_session on ai_conversations(session_id);

create table ai_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index idx_ai_messages_conversation on ai_messages(conversation_id);

-- ============================================================================
-- RESTAURANT SETTINGS  (single-row config table)
-- ============================================================================

create table restaurant_settings (
  id int primary key default 1 check (id = 1), -- enforce single row
  name text not null default 'Aroma FoodLand',
  phone text not null default '+234 810 398 0362',
  email text,
  address text not null default '74 Okpe Road, beside Foodland, Sapele, Delta State, Nigeria',
  opening_hours jsonb not null default '{"monday":"07:00-21:30","tuesday":"07:00-21:30","wednesday":"07:00-21:30","thursday":"07:00-21:30","friday":"07:00-21:30","saturday":"07:00-21:30","sunday":"07:00-21:30"}',
  delivery_fee numeric(10,2) not null default 500,
  minimum_order numeric(10,2) not null default 0,
  reservation_capacity_per_slot int not null default 10,
  currency text not null default 'NGN',
  tax_percent numeric(5,2) not null default 0,
  ai_enabled boolean not null default true,
  ai_system_prompt text,
  ai_welcome_message text default 'Hi! I''m the Aroma FoodLand assistant. Ask me about our menu, hours, reservations or catering.',
  updated_at timestamptz not null default now()
);

insert into restaurant_settings (id) values (1);

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id),
  action text not null,
  resource_type text,
  resource_id text,
  metadata jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_user on audit_logs(user_id);
create index idx_audit_logs_created on audit_logs(created_at desc);

-- ============================================================================
-- UPDATED_AT TRIGGER HELPER
-- ============================================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on profiles for each row execute function set_updated_at();
create trigger trg_meals_updated_at before update on meals for each row execute function set_updated_at();
create trigger trg_orders_updated_at before update on orders for each row execute function set_updated_at();
create trigger trg_payments_updated_at before update on payments for each row execute function set_updated_at();
create trigger trg_reservations_updated_at before update on reservations for each row execute function set_updated_at();
create trigger trg_catering_updated_at before update on catering_bookings for each row execute function set_updated_at();
create trigger trg_hotel_updated_at before update on hotel_bookings for each row execute function set_updated_at();
create trigger trg_cart_updated_at before update on cart_items for each row execute function set_updated_at();

-- ============================================================================
-- RATING AGGREGATION TRIGGER (keeps meals.rating_avg / rating_count in sync)
-- ============================================================================

create or replace function refresh_meal_rating()
returns trigger as $$
declare
  target_meal_id uuid;
begin
  target_meal_id := coalesce(new.meal_id, old.meal_id);
  if target_meal_id is null then
    return coalesce(new, old);
  end if;

  update meals m
  set rating_avg = coalesce((
        select round(avg(r.rating)::numeric, 2)
        from reviews r
        where r.meal_id = target_meal_id and r.is_approved = true and r.is_hidden = false
      ), 0),
      rating_count = (
        select count(*) from reviews r
        where r.meal_id = target_meal_id and r.is_approved = true and r.is_hidden = false
      )
  where m.id = target_meal_id;

  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger trg_review_rating_refresh
after insert or update or delete on reviews
for each row execute function refresh_meal_rating();

-- ============================================================================
-- RESERVATION DOUBLE-BOOKING GUARD
-- Ensures the sum of guests at a given date/time doesn't exceed slot capacity
-- ============================================================================

create or replace function check_reservation_capacity()
returns trigger as $$
declare
  capacity int;
  booked int;
begin
  select max_capacity into capacity
  from reservation_slots
  where slot_time = new.reservation_time and is_active = true;

  if capacity is null then
    -- fall back to global default capacity from settings
    select reservation_capacity_per_slot into capacity from restaurant_settings where id = 1;
  end if;

  select coalesce(sum(guests), 0) into booked
  from reservations
  where reservation_date = new.reservation_date
    and reservation_time = new.reservation_time
    and status in ('pending', 'confirmed', 'seated')
    and id <> coalesce(new.id, uuid_nil());

  if booked + new.guests > capacity then
    raise exception 'This time slot is fully booked. Please choose another time.';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_reservation_capacity
before insert or update on reservations
for each row execute function check_reservation_capacity();

-- ============================================================================
-- STOCK DECREMENT HELPER (called by the backend after an order is placed)
-- Never lets stock go negative; meals with stock = null are treated as
-- unlimited and are silently skipped.
-- ============================================================================

create or replace function decrement_meal_stock(p_meal_id uuid, p_qty int)
returns void as $$
begin
  update meals
  set stock = greatest(stock - p_qty, 0)
  where id = p_meal_id and stock is not null;
end;
$$ language plpgsql;
