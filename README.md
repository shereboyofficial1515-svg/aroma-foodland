# Aroma FoodLand — Restaurant Ordering, Reservation & Booking Platform

Full-stack platform for **Aroma FoodLand**, 74 Okpe Road, beside Foodland, Sapele, Delta State, Nigeria.

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+), Fetch API — no framework
- **Backend:** Node.js, Express.js, REST API
- **Database:** Supabase (PostgreSQL) with Row Level Security
- **Storage:** Supabase Storage
- **Auth:** Email/password + Google OAuth, via Supabase Auth
- **Payments:** Paystack (server-verified — the frontend redirect is never trusted alone)
- **Email:** Resend
- **AI:** Google Gemini, grounded in live database facts

See `PROGRESS.md` for a phase-by-phase log of what was built.

---

## 1. Project layout

```
aroma-foodland/
├── frontend/          # Static HTML/CSS/JS site (28+ pages)
│   ├── css/             # tokens.css, base.css, components.css
│   ├── js/               # api.js, auth.js, cart.js, ui.js, render.js, layout.js, icons.js
│   │   ├── pages/         # one script per public page
│   │   └── admin/         # admin dashboard shell + one module per section
│   ├── robots.txt, sitemap.xml
│   └── *.html
├── backend/           # Express REST API
│   └── src/
│       ├── config/       # env.js (validated config + feature flags), supabase.js
│       ├── controllers/  # request handlers, one file per resource
│       ├── routes/       # route definitions, mounted in routes/index.js
│       ├── middleware/   # auth, roles, security, upload, error handling
│       ├── services/     # Paystack, Resend, Gemini, storage, notifications, audit
│       └── utils/        # AppError, validate, schemas/, restaurantKnowledge.js
├── database/
│   ├── schema.sql      # tables, enums, triggers, indexes, RPC functions
│   ├── policies.sql    # Row Level Security policies
│   └── seed.sql        # sample categories/meals/reservation slots (dev only)
└── README.md / PROGRESS.md
```

---

## 2. Prerequisites

- Node.js 18+ (backend uses the built-in `fetch`, required for Paystack calls)
- A [Supabase](https://supabase.com) account (free tier is enough to start)
- A [Paystack](https://paystack.com) account (test mode keys are fine for development)
- A [Resend](https://resend.com) account
- A [Google Cloud](https://console.cloud.google.com) project for OAuth + a [Gemini API key](https://aistudio.google.com/apikey)
- A static file host or Node-friendly host for deployment (see §9)

---

## 3. Create and configure your Supabase project

1. Create a new project at supabase.com.
2. **Database** → SQL Editor → run, **in this exact order**:
   1. `database/schema.sql`
   2. `database/policies.sql`
   3. `database/seed.sql` (optional — dev/demo data only; skip in production or edit it first)
3. **Storage** → create these buckets, each set to **public** (read):
   - `meal-images`
   - `gallery`
   - `avatars`
   - `review-images`
   - `promo-images`
4. **Authentication → Providers**:
   - Email provider is on by default.
   - Enable **Google** (see §5 for the credentials).
   - Under **URL Configuration**, set:
     - Site URL: your frontend's production URL
     - Redirect URLs: add `https://YOUR_FRONTEND_DOMAIN/auth-callback.html`, `.../verify-callback.html`, `.../reset-password.html` (and the `http://localhost:...` equivalents for local dev)
5. **Project Settings → API** — copy:
   - Project URL → `SUPABASE_URL`
   - `anon` `public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (never expose this to the frontend or commit it)

### Creating your first admin

Registration always creates a `customer`. To promote your own account after signing up normally:

```sql
update profiles set role = 'super_admin' where id = '<your-auth-user-uuid>';
```

Find your UUID in **Authentication → Users** in the Supabase dashboard.

---

## 4. Configure the backend

```bash
cd backend
cp .env.example .env
npm install
```

Fill in `.env` (see the file for every variable) with the Supabase values from §3, plus Paystack/Resend/Gemini/Google keys from the sections below. Then:

```bash
npm run dev      # nodemon, auto-restarts on change
# or
npm start        # production
```

The API boots on `http://localhost:5000` by default and fails fast with a clear message if a required variable (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`) is missing. Optional integrations (Paystack/Resend/Gemini/Google) degrade to an honest "not configured" response rather than faking success if left blank — useful for getting the core site running before every integration is wired up.

Health check: `GET http://localhost:5000/health`

---

## 5. Google OAuth setup

1. [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials** → **Create Credentials → OAuth client ID** → type **Web application**.
2. Authorized redirect URI: `https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback`
3. Copy the **Client ID** and **Client Secret** into Supabase: **Authentication → Providers → Google**.
4. The backend's `.env` only needs `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` if you want the `/auth/google` "is Google configured" flag to reflect it — the actual OAuth exchange is handled by Supabase, not by our backend directly.

---

## 6. Paystack setup

1. Get your **test** keys first from the Paystack dashboard → Settings → API Keys & Webhooks.
2. Set `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_SECRET_KEY` in `.env`.
3. In the Paystack dashboard, set your **webhook URL** to `https://YOUR_BACKEND_DOMAIN/api/v1/payments/webhook`. This is the authoritative payment-confirmation path — the frontend's post-payment redirect is only a UX convenience, and the backend still calls Paystack's `/transaction/verify` API independently before trusting anything.
4. Switch to live keys only once you've tested the full checkout → payment → webhook flow end-to-end in test mode.

---

## 7. Resend (email) setup

1. Create an API key in the Resend dashboard.
2. Verify a sending domain (or use Resend's sandbox domain for testing).
3. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (must be an address on your verified domain) in `.env`.

Note: Supabase Auth sends its own emails (signup confirmation, password reset) using Supabase's built-in email service, separate from Resend. To customize those templates or use your own SMTP for them, see **Authentication → Email Templates** / **Auth → SMTP Settings** in the Supabase dashboard.

---

## 8. Gemini AI setup

1. Get an API key from [Google AI Studio](https://aistudio.google.com/apikey).
2. Set `GEMINI_API_KEY` in `.env`. `GEMINI_MODEL` defaults to `gemini-2.0-flash`.
3. Optionally tune the assistant's tone/instructions from the admin dashboard (**Admin → AI Assistant**) rather than redeploying — this only updates `restaurant_settings.ai_system_prompt`, never the API key.

---

## 9. Configure and run the frontend

The frontend is static files — no build step. Edit `frontend/js/config.js`:

```js
window.AROMA_CONFIG = {
  apiBaseUrl: 'https://YOUR_BACKEND_DOMAIN/api/v1', // was http://localhost:5000/api/v1 for local dev
};
```

For local development, serve the folder with any static server, e.g.:

```bash
cd frontend
npx serve .
# or: python3 -m http.server 5500
```

Make sure `FRONTEND_URL` in the backend's `.env` matches wherever you're serving the frontend from (CORS is locked to this single origin).

---

## 10. CORS and production domains

- Backend CORS is configured in `backend/src/app.js` and only allows `env.FRONTEND_URL`. Update this env var (not the code) when your production domain is finalized.
- Update every redirect URL that references a domain: Supabase Auth redirect URLs (§3), Paystack webhook URL (§6), and `FRONTEND_URL`/`BACKEND_URL` in `.env`.
- Update `frontend/js/config.js`'s `apiBaseUrl`, and the canonical URLs / `sitemap.xml` entries in the frontend if your production domain differs from `aromafoodland.com`.

---

## 11. Deploying

**Backend** (Render, Railway, Fly.io, a VPS, etc.):
- Any Node 18+ host works — it's a standard Express app (`backend/src/server.js`).
- Set all `.env` variables in your host's environment variable settings — never commit `.env`.
- Make sure the platform doesn't reorder the raw-body middleware in `app.js` — the Paystack webhook route needs the raw body *before* the JSON parser runs, or signature verification will fail.

**Frontend** (Netlify, Vercel, Cloudflare Pages, S3+CloudFront, or any static host):
- Deploy the `frontend/` folder as-is.
- No rewrite rules needed — every page is a real `.html` file, not client-side routing.

---

## 12. Security recommendations before going live

- Rotate every secret in `.env` to freshly generated values (`JWT_SECRET`, `COOKIE_SECRET`) — don't reuse anything from development.
- Switch Paystack to live keys only after testing the full webhook flow.
- Review and tighten the CSP in `backend/src/middleware/security.js` if you add new external scripts/fonts.
- In Supabase, double check `database/policies.sql` is applied — without it, RLS is enabled but has no policies, which **denies all access** by default (fails safe, but nothing will work until policies are in place).
- Enable Supabase's built-in rate limiting/captcha on auth endpoints for extra brute-force protection alongside this app's own `express-rate-limit` tiers.
- Cookies are set to `secure` automatically when `NODE_ENV=production` — your backend must be served over HTTPS in production for `sameSite: 'none'` cookies to work at all.
- Periodically review `/api/v1/admin/audit-logs` for unexpected admin actions.

---

## Security model at a glance

- The **service-role Supabase key never leaves the backend**. All writes to money-sensitive tables (orders, payments, notifications, audit logs) go through server-side validation — the client cannot insert/update them directly, even with a valid session (see `database/policies.sql`).
- **Prices are always recalculated server-side** at checkout from the live `meals` table — the frontend cart display is for the user's convenience only and is never trusted as the source of truth for what gets charged.
- Paystack payments are **verified server-side** (both a `/verify` call and a signature-checked webhook, sharing one idempotent confirmation function) before an order is marked paid.
- Passwords are never stored or handled by our backend directly — Supabase Auth manages hashing and storage.
- Role changes have guardrails: you can't grant a role higher than your own, can't modify a peer/superior's role, and can't change your own role or disable your own account.
- The Gemini AI assistant is grounded in a live DB snapshot taken immediately before each call — it cannot invent prices, availability, or policies it was never shown, and a prompt-injection guard is built into its system instructions.

---

## Known scope notes

- `database/seed.sql` is for local development/demos. Review or skip it before seeding a production database.
- The reservation-reminder job (`POST /reservations/admin/send-reminders`) needs an external scheduler (cron, or your host's scheduled-jobs feature) to fire automatically — it's a real, working endpoint, just not self-triggering without one.
- Image uploads (meals, gallery, reviews) go to Supabase Storage; make sure the buckets from §3 are created before using those features.

## License / credit

Built for Aroma FoodLand, Sapele, Delta State, Nigeria.
