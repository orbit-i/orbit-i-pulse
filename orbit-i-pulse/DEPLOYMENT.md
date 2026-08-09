# Deployment Guide — ORBIT-I Pulse

This guide walks through deploying **one instance of ORBIT-I Pulse for one client**, end to end, using **Vercel + Supabase only**. This is the sole supported deployment path for this build — do not deploy to cPanel, shared hosting, or any other VPS.

Repeat this entire guide for every new client. Each client gets their own isolated Vercel project and Supabase project.

---

## Prerequisites

- A GitHub (or GitLab/Bitbucket) account to host the repo
- A [Vercel](https://vercel.com) account (free tier is enough to start)
- A [Supabase](https://supabase.com) account (free tier is enough to start)
- Node.js 18+ installed locally (for running the bootstrap script)
- The client's branding assets: logo file/URL, brand colors (hex codes), admin email address

---

## Step 1 — Create the Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New Project**.
2. Name it something identifiable, e.g. `acmecorp-orbit-pulse`.
3. Choose a strong database password and save it somewhere safe (you likely won't need it directly, but keep it).
4. Pick a region close to the client.
5. Wait for the project to finish provisioning (~2 minutes).

### Run the schema

**New deployment (fresh Supabase project):**
1. In the Supabase dashboard, open **SQL Editor**.
2. Open `supabase/schema.sql` from this repo, copy its entire contents.
3. Paste into the SQL Editor and click **Run**.
4. Confirm all 5 tables were created: `users`, `attendance`, `daily_reports`, `performance_reviews`, `company_settings`.

**Updating an existing deployment that was set up before this version:**
1. Run `supabase/migration-2-regno-roles-reset.sql` instead (in the SQL Editor, same as above).
2. This adds registration numbers, the extra roles (`employee`, `core_team_member`), self-serve password reset fields, and late/early attendance flags — without touching any existing data.
3. Run `npm run check-schema` afterward to confirm it applied correctly.

### Get your API credentials

1. Go to **Project Settings → API**.
2. Copy the **Project URL** → this is your `SUPABASE_URL`.
3. Copy the **`service_role` key** (NOT the `anon` key) → this is your `SUPABASE_SERVICE_ROLE_KEY`.

> ⚠️ **The `service_role` key bypasses all database security and must never be exposed to the browser.** It only ever lives in server-side environment variables (Vercel's encrypted env var storage), never in `NEXT_PUBLIC_*` variables, never committed to git.

---

## Step 2 — Prepare environment variables

Copy `.env.example` to `.env.local` in your local copy of the repo:

```bash
cp .env.example .env.local
```

Fill in every value:

```bash
# Client branding
NEXT_PUBLIC_COMPANY_NAME="Acme Corp"
NEXT_PUBLIC_LOGO_URL="https://yourcdn.com/acme-logo.png"
NEXT_PUBLIC_FAVICON_URL="https://yourcdn.com/acme-favicon.ico"
NEXT_PUBLIC_ADMIN_EMAIL="admin@acmecorp.com"
NEXT_PUBLIC_PRIMARY_COLOR="#0F766E"
NEXT_PUBLIC_SECONDARY_COLOR="#0C0A09"

# Supabase (from Step 1)
SUPABASE_URL="https://xxxxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# JWT secret — generate a new one PER CLIENT, never reuse
JWT_SECRET="<paste output of the command below>"
```

Generate a secure `JWT_SECRET`:

```bash
openssl rand -base64 32
```

If the client doesn't have brand colors or a hosted logo URL yet, leave the defaults — they fall back to the bundled ORBIT-I branding (`/orbit-i-logo.jpg`) until you swap them in.

---

## Step 3 — Verify the connection before going further

Before installing dependencies wastes your time on a typo, run the schema/env check:

```bash
npm install
npm run check-schema
```

This confirms `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `JWT_SECRET` are all set, and that every table from `supabase/schema.sql` actually exists and is reachable. Fix anything it flags before continuing — every later step depends on this passing.

---

## Step 4 — Create the first admin account

Registration is open — anyone can create an account from `/register`, and **the first account ever created automatically becomes admin.** Everyone who registers after that starts as `intern` and is promoted to `manager`/`admin` later from the **Team** page.

You have two options:

**Option A — register normally as the first user (recommended for most cases):**
Just run the app (`npm run dev` locally, or visit the live Vercel URL after deploying) and use the **Register** button as the very first person. You'll automatically be admin.

**Option B — create the admin yourself via script, without it being the literal first page-load:**

```bash
npm run bootstrap-admin
```

You'll be prompted for:
- Full name
- Email
- Password (input is hidden as you type)

This writes directly into the client's Supabase `users` table with role `admin`. Use this if you want to control exactly who the first admin is, rather than whoever opens the live site first.

Give these credentials to the client (or keep them, if you're administering on their behalf).

---

## Step 5 — Push the repo to GitHub

```bash
git init
git add .
git commit -m "Initial deployment for Acme Corp"
git remote add origin https://github.com/yourusername/acmecorp-orbit-pulse.git
git push -u origin main
```

> `.env.local` is excluded via `.gitignore` — never commit real secrets to git, even in a private repo.

---

## Step 6 — Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → select the repo you just pushed.
2. Framework Preset should auto-detect as **Next.js**. Leave build settings default.
3. Before deploying, expand **Environment Variables** and add every variable from your `.env.local`:
   - All `NEXT_PUBLIC_*` variables
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
4. Click **Deploy**.
5. Wait for the build to finish (~1–2 minutes). Vercel gives you a live URL like `acmecorp-orbit-pulse.vercel.app`.

### Optional: custom domain

In the Vercel project → **Settings → Domains**, add the client's own domain (e.g. `team.acmecorp.com`) and follow the DNS instructions Vercel provides (usually a CNAME record).

---

## Step 7 — Verify the deployment

1. Visit the live URL → you should land on the home page, branded with the client's logo and colors, with Sign In / Register buttons.
2. Visit `/api/health` → confirm every check shows `"ok": true`. If anything fails, fix it before continuing — nothing else will work otherwise.
3. Click **Register** and create the first account → confirm it logs you straight into `/dashboard` (this account is automatically `admin`).
4. Open an incognito window, go to `/register`, and register a second account (e.g. a test intern) → confirm it lands in the dashboard as role `intern`.
5. As the admin, go to **Team**, find the test intern, and change their role and manager assignment → confirm it updates.
6. As the intern, check in/out on the **Attendance** page and submit a report on the **Daily Reports** page.
7. As the admin, confirm the report appears under **Reports**, rate it, and confirm the rating shows up correctly.
8. From **Team**, click **Export Attendance CSV** and **Export Reports CSV** — confirm both download correctly.

If all of the above works, the deployment is complete and ready to hand off to the client.

---

## Updating a deployed client later

Since each client has their own Vercel project connected to their own GitHub repo:

```bash
git add .
git commit -m "Describe the update"
git push
```

Vercel automatically redeploys on every push to the connected branch. No manual server restarts, no SSH, no downtime in the typical case.

---

## Rotating secrets

If a `JWT_SECRET` or `SUPABASE_SERVICE_ROLE_KEY` is ever leaked:

1. **JWT_SECRET**: Generate a new one (`openssl rand -base64 32`), update it in Vercel → Environment Variables → redeploy. This immediately invalidates all existing login sessions (users will need to log in again) — this is expected and safe.
2. **Supabase service_role key**: In Supabase → Project Settings → API, regenerate the key, then update it in Vercel and redeploy.

---

## Exporting / migrating a client's data

Since the database is plain PostgreSQL, you can export it at any time using Supabase's built-in backup tools, or directly via `pg_dump` if you need a portable SQL file:

```bash
pg_dump "postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres" > backup.sql
```

This gives the client (or you) a fully portable copy of their data, independent of any particular hosting provider — consistent with the "ownership security" requirement this software was built around.
