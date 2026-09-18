-- Migration 002: "New" / "Recommended" meal classification + portion info.
-- Additive only — safe to run against an existing populated database.
-- Run in Supabase → SQL Editor (already-installed projects; fresh installs
-- get these columns from schema.sql directly).

alter table meals
  add column if not exists portion_info text,
  add column if not exists is_new boolean not null default false,
  add column if not exists is_recommended boolean not null default false;

create index if not exists idx_meals_new on meals(is_new) where is_new = true;
create index if not exists idx_meals_recommended on meals(is_recommended) where is_recommended = true;
