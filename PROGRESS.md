# Build Progress

## Phase 1 — Scaffolding, database, backend foundation ✅ DONE
- [x] Project directory structure (frontend / backend / database)
- [x] Full Supabase schema: profiles, addresses, meals, categories, meal images,
      cart, orders, order items, payments, reservations, reservation slots,
      catering bookings, hotel bookings, reviews, review images, gallery,
      notifications, promotions, contact messages, ai_conversations,
      ai_messages, restaurant_settings, audit_logs
- [x] Triggers: `updated_at` maintenance, meal rating aggregation,
      reservation double-booking guard
- [x] Row Level Security policies for every table (`database/policies.sql`)
- [x] Seed data: categories, sample meals, reservation slots, gallery placeholders
- [x] `.env.example` with every required/optional integration key
- [x] Backend bootstrap: `env.js` (validated config + feature flags),
      `supabase.js` (admin/anon/user-scoped clients), `AppError` +
      `asyncHandler`, global error handler, security middleware
      (Helmet CSP, CORS, rate limiters), Express app assembly, server entry
- [x] Route aggregator scaffold (`routes/index.js`) ready for feature routers

## Phase 2 — Backend core: auth, meals, categories ✅ DONE
- [x] Supabase Auth integration: register, login, logout, refresh, `/auth/me`
- [x] `protect` / `optionalAuth` session middleware (cookie or Bearer token)
- [x] Google OAuth flow (`/auth/google` authorize URL + `/auth/session` sync,
      auto-creates `profiles` row from Google metadata on first login)
- [x] Password reset (`/auth/forgot-password`, `/auth/reset-password`) +
      logged-in `/auth/change-password` (re-verifies current password first)
- [x] Email verification status synced from Supabase into `profiles.email_verified`
- [x] Role-based authorization: `requireRole()` with a rank hierarchy
      (customer < staff < manager < admin < super_admin) + `requireSelfOrStaff()`
- [x] Zod request validation middleware, reused across all future routes
- [x] Audit log service (fire-and-forget, used on register/login/password
      change/meal & category writes)
- [x] Supabase Storage upload service (type/size validated, 5MB limit,
      JPG/PNG/WEBP/GIF only) + Multer memory-storage middleware
- [x] Resend email service with graceful "not configured" fallback, plus
      branded HTML templates for every transactional email in the spec
- [x] Categories: public read (active only) / staff create-update, manager delete,
      blocked from deleting a category still in use
- [x] Meals: public browse with search/category/price-range/featured/popular
      filters, 4 sort modes, pagination; meal-detail with related meals;
      staff CRUD; safe delete (auto-disables instead of hard-deleting a meal
      that has order history, so past orders stay intact); multi-image upload

## Phase 3 — Cart, orders, Paystack payments ✅ DONE
- [x] Cart: persisted per user, always re-priced live from `meals` (never a
      stored/stale price), flags unavailable/out-of-stock lines without
      breaking the rest of the cart
- [x] Checkout re-prices the cart server-side from scratch (`orderService.
      priceCartForCheckout`) — client-submitted prices are never trusted
- [x] Idempotency: `orders.idempotency_key` is unique, so a double-submitted
      checkout returns the existing order instead of creating a duplicate
- [x] Order number generation, delivery fee + minimum-order enforcement from
      `restaurant_settings`, atomic-ish order+items creation with rollback
      if item insertion fails, stock decrement via a guarded SQL function
      that never goes negative
- [x] Order history (customer) / all-orders (staff) with status filter +
      pagination; order detail with items/payment/address; status-change
      endpoint that fires the right notification + email per status
- [x] Paystack: `initialize` (reuses an existing pending reference instead of
      creating duplicates, blocks paying twice for an already-paid order),
      `verify` (always re-checks with Paystack's API — the redirect alone is
      never trusted), and a signature-verified `webhook` as the authoritative
      server-to-server confirmation path
- [x] `paymentService.confirmPaymentByReference` is idempotent and shared by
      both verify + webhook, so whichever fires first "wins" and the second
      is a safe no-op — no duplicate emails, no double-processing
- [x] Amount-matching check between our stored order total and what Paystack
      actually confirms, before marking anything paid
- [x] Webhook route mounted with `express.raw()` ahead of the JSON parser
      (required for HMAC signature verification), isolated to that one route

## Phase 4 — Reservations, catering/event bookings, Resend emails ✅ DONE
- [x] `GET /reservations/availability?date=` — remaining capacity per slot so
      the frontend can grey out full times before hitting the DB guard
- [x] Reservation create (guest or logged-in), list (mine/staff), detail,
      staff status updates (confirm/seat/complete/cancel/no-show),
      owner/staff reschedule (re-validates capacity via the same DB trigger),
      owner/staff cancel
- [x] Admin reservation-slot capacity management (`/reservations/admin/slots`)
- [x] `/reservations/admin/send-reminders` — sends today's confirmed
      reservations a reminder email + notification; designed to be triggered
      by an external scheduler (cron / hosting platform scheduled job) or
      manually from the admin dashboard
- [x] Catering/event bookings (`/catering`) and hotel bookings (`/bookings/hotel`)
      built from one shared factory (`makeBookingController`) so both types
      stay consistent: create → admin email alert → staff approve/reject/
      complete/cancel with notes → customer notification + email at each step
- [x] Contact form (`/contact`): public submit with acknowledgement email to
      the customer + alert email to the restaurant inbox, staff inbox
      list/mark-as-read
- [x] Every flow above uses the same `notificationService` + `emailService`
      + `auditService` primitives from Phase 2/3 — no duplicated logic

## Phase 5 — Reviews, notifications, gallery, search ✅ DONE
- [x] Reviews: creation gated to the review author's own **completed** order
      (one review per order, enforced both here and by the Phase-1 DB
      constraint), starts unapproved until staff moderate; optional review
      images; public listing shows only approved+visible reviews unless the
      caller is staff; staff approve/hide/feature/delete
- [x] Notifications: paginated list with unread count, mark one/all as read,
      delete — this is what powers the "notification center" the spec asks for
- [x] Gallery: public read (filterable by category/featured), staff bulk
      upload with captions, update, delete (also removes the Storage object,
      not just the DB row)
- [x] Global search across meals, categories, and a shared "restaurant
      knowledge" module (services + FAQs) — this same knowledge module is
      reused by the Gemini assistant in Phase 6 so search and AI answers
      never contradict each other
- [x] Clean empty-state signal (`empty: true`) so the frontend can show a
      proper "No results found" state instead of an empty list with no context

## Phase 6 — Gemini AI assistant ✅ DONE
- [x] `geminiService.generateReply`: every reply is grounded in a live
      snapshot pulled from the DB right before calling Gemini — keyword
      search against the current message finds relevant meals (falling back
      to featured/popular items), plus restaurant settings (hours, address,
      delivery fee, minimum order) and the shared services/FAQ knowledge
      module from Phase 5. This is the mechanism behind "never invent
      prices/availability/policies" — the model is only ever shown real,
      current facts, never asked to recall a static training-time menu
- [x] System prompt includes an explicit prompt-injection guard: instructions
      embedded in the customer's message that try to override the rules,
      leak the prompt, or redefine the assistant's role are treated as a
      question it can't help with, not obeyed
- [x] No PII sent to Gemini — only the message text and public restaurant/menu
      facts; user identity, order history, etc. never leave the DB layer
- [x] `ai_enabled` flag checked before every generation; when Gemini isn't
      configured or is turned off, the customer gets an honest fallback
      pointing them to the phone number/contact form — never a faked response
- [x] Conversation persistence (`ai_conversations`/`ai_messages`), works for
      guests (by session id) and logged-in users, with guest→account linking
      if they log in mid-conversation; last 10 turns kept as context
- [x] Rate-limited chat endpoint (20 messages/minute/IP) to bound API cost/abuse
- [x] Admin AI controls: enable/disable, edit system instructions, edit
      welcome message, and review past conversations — all staff/admin-gated

## Phase 7 — Admin dashboard (remaining backend pieces) ✅ DONE
- [x] `GET /admin/dashboard`: every figure is a real, request-time aggregate
      query (today/week/month sales, orders today, pending/completed orders,
      reservations today, pending reservations, total customers, popular
      meals, a 7-day revenue series for charting, recent orders, recent
      reviews) — nothing hardcoded or estimated
- [x] `GET /admin/audit-logs` (admin+): filterable, paginated view over every
      audit event recorded since Phase 2 (auth, meals, categories, orders,
      payments, reservations, bookings, reviews, gallery, AI settings, role
      changes, account status changes, settings changes)
- [x] Customer management: search/filter/paginate, view a customer's own
      order + reservation history, role changes (rank-gated — you can't
      grant a role higher than your own, can't modify a peer/superior, can't
      change your own role), enable/disable accounts (also can't self-disable)
- [x] Restaurant settings API: public safe subset (`/settings/public`) for
      the storefront, full read for staff, write for admin+ — one config
      surface backing hours/delivery fee/minimum order/tax/reservation
      capacity, reused everywhere those values are already referenced
      (checkout, reservations, AI grounding)
- [x] Promotions/announcements: staff create/edit/delete, with an optional
      one-click broadcast that fans out a `notifications` row to every user
      in the target audience (all/customers/staff), chunked to stay under
      per-request limits
- [x] Meal/category/order/reservation/booking/review/gallery admin actions
      were already built with `requireRole('staff'|'manager')` gating across
      Phases 2–5 — this phase completes the admin API surface rather than
      duplicating them

## Phase 8 — Public frontend pages ✅ DONE
- [x] Design tokens (`css/tokens.css`): paprika/palm-green/turmeric palette,
      Fraunces + Inter type scale, spacing/radius/shadow/motion scales,
      `prefers-reduced-motion` handled at the token layer
- [x] Base styles (`css/base.css`): reset, typography, layout primitives,
      buttons, forms, badges, skeleton loaders, toasts, empty states,
      visible focus states everywhere
- [x] Component styles (`css/components.css`): header/nav (incl. mobile
      menu), footer, meal cards, hero, feature tiles, review cards, gallery
      grid, confirmation modal, AI chat widget, order-tracking timeline,
      cart/checkout layout, admin dashboard shell (sidebar/tables/stat cards)
- [x] Hand-authored inline SVG icon set (`js/icons.js`) — no emojis, no
      external icon-CDN runtime dependency
- [x] Shared JS foundation: `api.js` (fetch wrapper with credentialed
      cookies + silent-refresh-and-retry on 401), `auth.js` (session state
      via `/auth/me`, broadcasts `aroma:auth-changed`), `cart.js` (add-to-cart
      + header badge sync), `ui.js` (toasts, confirm modals, generic form
      modal, button loading states, skeletons, empty states), `render.js`
      (shared meal/review/gallery card markup), `layout.js` (injects
      header/footer into every page from one place, mobile nav, scroll-reveal,
      AI chat widget bootstrap)
- [x] Full customer journey wired to the real API end to end: homepage,
      menu (search/filter/sort/pagination), meal details, cart, checkout,
      Paystack redirect + order confirmation (server-verified), my orders +
      order details with tracking timeline, login/register (+ Google OAuth),
      forgot/reset password, OAuth & email-verification callback pages,
      account hub (profile, saved addresses, password, notification prefs),
      reservations (live slot availability + history), catering/event
      booking, hotel booking, reviews (order-gated submission + public feed),
      gallery, notifications center, global search, about, contact (wired to
      `/contact`), offers, privacy/terms/refund policy pages
- [x] Two backend gaps discovered and filled while wiring the account page:
      `PATCH /users/me` (self profile/notification-prefs update, deliberately
      separate from the admin-only role/status endpoints) and a full
      `addresses` CRUD API — both added with the same validation/ownership
      patterns as the rest of the backend
- [x] Admin dashboard (`admin.html` + `js/admin/*.js`): role-gated shell
      (redirects/blocks non-staff), Dashboard analytics, Meals CRUD, Categories
      CRUD, Orders status management, Customers (role + status management
      with the same guardrails as the API), Reservations status + manual
      reminder trigger, Catering/Hotel bookings approve/reject, Reviews
      moderation, Gallery upload/delete, Promotions with broadcast, AI
      Assistant controls + conversation review, Restaurant Settings, Audit Logs

## Phase 9 — Polish: SEO, README, final checks ✅ DONE
- [x] `robots.txt` (blocks account/checkout/admin pages from indexing) +
      `sitemap.xml` for public pages
- [x] Full production README: Supabase/Storage/Auth setup, Google OAuth,
      Paystack (incl. webhook URL), Resend, Gemini, running the backend and
      static frontend, CORS/domain checklist, deployment notes for both
      halves, a pre-launch security checklist, and a "known scope notes"
      section calling out what still needs a human decision (seed data,
      external cron for reminders, Storage bucket creation)
- [x] Every backend JS file passes `node --check`; every frontend JS file
      passes `node --check`; every HTML page's tags balance-checked
