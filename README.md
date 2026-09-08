# ডিজিটাল ভিক্ষা ও সদকা পোর্টাল — Digital Vikha & Sadaqah Portal BD

A production-shaped donation platform that connects donors in Bangladesh with
verified people in need, using the mobile financial services they already have
(bKash, Nagad, Rocket).

```
Vikha project/
├── backend/     Node.js + Express + MongoDB REST API   → deploy to Render
├── frontend/    Next.js 16 (App Router) + Tailwind      → deploy to Vercel
└── digital_vikha_portal_bangladesh.html   the original single-file prototype
```

---

## How money actually moves

**It doesn't move through this app.** That is the whole design.

1. The donor opens their own bKash / Nagad / Rocket app and sends money
   directly to the seeker's personal number.
2. Back on the site, the donor submits the **Transaction ID** the MFS app gave
   them, plus the number they sent from.
3. An admin checks that transaction against the seeker's statement and marks it
   **verified**. Only then does the amount count toward the seeker's totals.

### Why not a "bKash payment screen"?

The original prototype had a checkout modal that asked for the donor's MFS
**PIN**. That is exactly the shape of an MFS phishing page — no legitimate
gateway ever asks a customer to type their PIN into a third-party website, and
building a convincing one is dangerous whatever the intent. It is not
implemented here, and the UI says so out loud in the footer and in the donate
flow: *"এই সাইট কখনো আপনার পিন চায় না।"*

When you are ready for real automated payments, get a merchant account with
bKash PGW / Nagad / SSLCommerz and add a payment provider that creates the
donation as `pending` and flips it to `verified` on the gateway's callback.
`donation.controller.js` is the only file that needs to change — the model
already carries `status`, `trxId`, `reviewedBy` and `reviewedAt`.

---

## Quick start (local)

You need Node.js 20+ and a MongoDB connection string.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # then fill in the values (see below)
npm run seed              # creates the admin user + 6 sample seekers
npm run dev               # http://localhost:5000
```

Check it: <http://localhost:5000/health>

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev               # http://localhost:3000
```

### 3. Sign in as admin

The seed script creates an admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`
(default `admin@vikha.bd` / `Admin@12345`). **Change that password before you
deploy anything.** Admin accounts are never created through the public API —
only by the seed script or directly in the database.

---

## Environment variables

### backend/.env

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | ✅ | Your MongoDB Atlas SRV string |
| `MONGODB_DB_NAME` | | Defaults to `digital_vikha` |
| `JWT_SECRET` | ✅ | Long random string; must be ≥ 24 chars in production |
| `JWT_EXPIRES_IN` | | Defaults to `7d` |
| `CORS_ORIGINS` | | Comma-separated frontend origins. `*.vercel.app` previews are always allowed |
| `PORT` | | Render sets this automatically |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | | Used only by `npm run seed` |
| `CLOUDINARY_CLOUD_NAME` | | **You still need to fill this in** — see below |
| `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | | Image uploads |
| `GEMINI_API_KEY` | | Optional. Without it, duas come from a curated local pool |
| `GEMINI_MODEL` | | Defaults to `gemini-2.0-flash` |
| `AUTO_APPROVE_SEEKERS` | | `true` skips the review queue. Keep it `false` in production |

> **Cloudinary cloud name.** The API key and secret alone are not enough —
> Cloudinary URLs are built from the cloud name. Find it at the top-left of
> your Cloudinary dashboard (something like `dxxxxxxxx`) and put it in
> `CLOUDINARY_CLOUD_NAME`. Until then `/uploads/*` returns a clear `503` and
> everything else works normally; the registration form just skips the photo.

### frontend/.env.local

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL **including** `/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | Used for QR codes and share links |

`GEMINI_API_KEY` is deliberately **not** exposed to the browser — the frontend
calls `POST /api/v1/ai/dua` and the key never leaves the server.

---

## Deploying

### Backend → Render

1. Push this repository to GitHub.
2. Render → **New → Web Service** → pick the repo.
3. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm ci`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
4. Add the environment variables from the table above.
5. In MongoDB Atlas → **Network Access**, allow Render's outbound IPs, or
   `0.0.0.0/0` if you are on the free tier and cannot pin them.
6. Seed once — **from your own machine, not from Render**. The free plan has no
   shell, and it does not need one: the seed script talks to the same Atlas
   cluster your Render service uses, so running it locally seeds production.

   ```bash
   cd backend
   npm run seed
   ```

`render.yaml` at the repository root describes all of this if you prefer a
Blueprint deploy (Render → **New → Blueprint** → pick the repo). Render only
looks for that file at the repository root, which is why it lives there rather
than inside `backend/`.

> Render's free tier sleeps after 15 minutes of inactivity, so the first
> request after idling takes ~30 seconds. The frontend shows loading skeletons
> rather than breaking, but a paid instance is worth it for real traffic.

### Frontend → Vercel

The backend is live at `https://digital-vikha-backend.onrender.com`, and
`frontend/.env.local` already points at it.

1. Vercel → **Add New… → Project** → import `RakibHassanSoft/Vikhha-website`.
2. **Project Name:** `vikha-sadaqah` — this becomes the URL,
   `https://vikha-sadaqah.vercel.app`.
3. **Root Directory:** `frontend`. This repository holds two apps, and Vercel
   needs to be told which one. Framework preset is detected as Next.js.
4. Environment variables (add before the first deploy, for **all** environments):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://digital-vikha-backend.onrender.com/api/v1` |
   | `NEXT_PUBLIC_SITE_URL` | `https://vikha-sadaqah.vercel.app` |

5. Deploy.

`NEXT_PUBLIC_*` values are compiled into the bundle, so changing one in the
dashboard does nothing until you redeploy. If the project name is taken and you
end up on a different domain, update `NEXT_PUBLIC_SITE_URL` and redeploy.

No CORS work is needed: the backend already accepts any `*.vercel.app` origin,
including preview deployments. A custom domain is the exception — add it to the
backend's `CORS_ORIGINS` on Render and redeploy the backend.

`frontend/vercel.json` sets cache and security headers; Vercel reads it from the
root directory you configured above. `frontend/netlify.toml` is left in place in
case you ever want Netlify instead — the two are independent and neither
interferes with the other.

---

## Testing

```bash
cd backend
npm test            # 67 offline tests — no database or network needed
npm run test:smoke  # full end-to-end run against your real MongoDB
```

`npm run test:smoke` creates a throwaway `<db>_test` database, exercises
registration, login, role checks, profile approval, donation submission,
duplicate-transaction rejection, admin verification, live location sharing,
statistics and ownership boundaries, then drops the database.

---

## API reference

Base URL: `<host>/api/v1`. Successful responses are
`{ "success": true, "data": …, "meta": … }`; failures are
`{ "success": false, "error": { "message": …, "details": [{ field, message }] } }`.

### Public

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/seekers` | Approved seekers. `?q= &category= &district= &sort= &page= &limit=` |
| `GET` | `/seekers/map` | Approved seekers that have coordinates. `?live=true` for only those sharing right now |
| `GET` | `/seekers/districts` | District facet counts |
| `GET` | `/seekers/:slug` | One profile plus its 10 most recent verified donations |
| `POST` | `/donations` | Submit a transaction for verification |
| `GET` | `/donations/receipt/:receiptNo` | Public receipt lookup |
| `GET` | `/stats/overview` | Today / lifetime totals, queue sizes |
| `GET` | `/stats/leaderboard` | Top seekers by lifetime collection |
| `POST` | `/ai/dua` | Generate a Bangla dua |
| `GET` | `/health` | Liveness + database state |

### Authenticated

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/auth/register` | Role may be `donor` or `seeker` only |
| `POST` | `/auth/login` | Returns a JWT |
| `GET` | `/auth/me` | Current user + seeker profile |
| `POST` | `/seekers` | Create your seeker profile (one per account) |
| `GET` | `/seekers/me/profile` | Your profile + pending donation count |
| `PATCH` | `/seekers/me/location` | Send a position fix. Coordinates only — never resets the review status |
| `DELETE` | `/seekers/me/location` | Stop sharing live location |
| `PATCH` | `/seekers/:id` | Owner or admin. Owner edits reset status to `pending` |
| `GET` | `/donations/mine` | Donations you made |
| `GET` | `/donations/received` | Donations you received |
| `POST` | `/uploads/image` | Multipart, field name `image`, ≤ 5 MB |
| `GET` | `/uploads/signature` | For direct browser → Cloudinary uploads |

### Admin only

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/admin/seekers?status=pending` | Review queue |
| `PATCH` | `/admin/seekers/:id/review` | `{ status, statusNote }` |
| `GET` | `/admin/donations?status=pending` | Verification queue |
| `PATCH` | `/admin/donations/:id/review` | `{ status: "verified" \| "rejected" }` |

---

## Live location sharing

A seeker can put themselves on the map in two ways, and neither involves typing
coordinates.

**A fixed pin, set once.** On the registration form there is a single switch —
*ম্যাপে আমার অবস্থান দেখান*. Turning it on asks the browser for permission and
drops a pin where they are; they can drag it or tap the map to correct it, and
the street address fills itself in via OpenStreetMap's free Nominatim reverse
geocoder. If permission is refused, or the phone has no GPS fix, a *"ম্যাপে
নিজেই পিন বসাই"* link is available the whole time so nobody is stuck waiting.

**Live sharing, while they are out.** On their dashboard there is a second
switch. While it is on, the browser watches their position and the app sends a
fix to `PATCH /seekers/me/location`. Donors see them on the map as a pulsing
green marker with a "how long ago" timestamp, and can filter the map down to
*শুধু লাইভ*.

Everything about it is designed to fail closed:

- **Opt-in, per session.** It is off by default and never turns itself on.
- **Cheap.** A ping is only sent after ~30 seconds *and* ~20 metres of movement,
  so a person sitting still costs almost nothing in battery or requests.
- **Self-expiring.** A pin stops counting as live 10 minutes after the last
  ping, so a closed tab, a dead battery, or a lost signal removes them from the
  live map on its own.
- **Auto-stop.** Sharing switches itself off after two hours regardless.
- **One tap off.** `DELETE /seekers/me/location` clears it immediately; the last
  known pin stays on the ordinary map, and the profile is untouched.
- **Separate from the profile.** Location pings go to their own endpoint, so
  walking down the street never sends a profile back into the admin review queue
  — which is exactly what would happen if they reused `PATCH /seekers/:id`.
- **Bangladesh only.** Coordinates outside the country's bounding box are
  rejected by the schema and by the validator.

The map is OpenStreetMap tiles through Leaflet: no API key, no billing, no
usage cap to sign up for. Nominatim is only called after a deliberate tap, never
on a timer, which keeps it inside their one-request-per-second fair-use policy.

> Worth thinking about before launch: a live map of vulnerable people is
> sensitive. The safeguards above limit the blast radius, but you should decide
> deliberately whether live sharing suits your users, and consider whether a
> seeker should be able to see who has been viewing their pin.

## Design notes

- **Daily totals reset on the Bangladesh day**, not UTC midnight. `utils/dhaka.js`
  owns that boundary; a seeker's `collectedToday` rolls over the first time it is
  touched after 00:00 Asia/Dhaka, and stale values are zeroed on read so a card
  never shows yesterday's progress.
- **Transaction IDs are unique per method** (`{ method, trxId }` unique index),
  so the same reference cannot be claimed twice.
- **Anonymous donations** strip the donor's name and phone in the model's
  `toJSON`, so they cannot leak through any endpoint that returns a donation.
- **Identity proof images** are `select: false` on the schema — they are only
  ever loaded for admin queries.
- **Rate limits** are per-route: 30 auth attempts / 15 min, 40 donations / hour,
  30 dua generations / 10 min, 300 location pings / hour.
- **A sleeping API never turns a shared link into a 404.** The seeker profile
  page is server-rendered for SEO, but it only returns 404 when the API says the
  seeker genuinely does not exist. If the API times out or errors — which is the
  normal case on a free tier that sleeps after 15 minutes — the page renders and
  the browser fetches the profile itself.
- **Gemini is optional and never fatal.** If the key is missing, the request
  fails, or it times out after 12 s, the endpoint falls back to a curated pool of
  Bangla duas and reports `source: "fallback"`.

## Before you go live

- [ ] Change `ADMIN_PASSWORD` and re-seed, or change the password in the app
- [ ] Generate a long random `JWT_SECRET` (Render can do this for you)
- [ ] Set `AUTO_APPROVE_SEEKERS=false`
- [ ] Fill in `CLOUDINARY_CLOUD_NAME`
- [ ] Rotate the Cloudinary and Gemini keys if they have ever been shared in
      plain text — including in the chat where this project was built
- [ ] Restrict Atlas network access to Render's IPs
- [ ] Decide how you will verify that a seeker is genuinely in need; the
      software can queue and record, but only a human can vouch
