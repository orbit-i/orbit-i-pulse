# ORBIT-I Pulse

**White-label Intern & Team Management Software** — self-hosted, one-time-sale, built for selling to individual companies who want their own private, fully-owned attendance + task management system.

Powered by ORBIT-I.

---

## What this is

ORBIT-I Pulse is a complete, monolithic Next.js application that gives a company:

- **Attendance tracking** — check-in/check-out with timestamp and IP address logging
- **Daily reports & performance reviews** — interns submit daily progress, managers rate it 1–5 with feedback
- **Open self-registration** — anyone can create an account from `/register`. The very first account ever created automatically becomes admin; everyone after that starts as `intern` and gets promoted by an admin from the Team page
- **Team management** — admin view of all staff, manager-intern assignment, role-based access
- **CSV export** — attendance and reports data, for payroll/HR handoff
- **Full white-labeling** — company name, logo, theme colors, and admin email are all configurable per deployment
- **Local JWT authentication** — no Auth0, no Clerk, no Supabase Auth. Sessions are signed JWTs in an httpOnly cookie. The software has zero dependency on a third-party identity provider.
- **Fully responsive** — works cleanly on mobile, tablet, and desktop

## Who this is for

You (as the seller) deploy **one separate copy of this software per client**. Each client gets:

- Their own Vercel project (frontend + API)
- Their own Supabase project (Postgres database)
- Their own environment variables (their brand, their secrets)

There is **no shared infrastructure** between clients. This is what makes it a genuine one-time-sale product: once you hand a client their deployed instance, you have no ongoing hosting cost, and they own their data outright.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend + Backend | Next.js 14 (App Router) — single monolithic codebase |
| Database | PostgreSQL via Supabase |
| Authentication | Local JWT (`jose`) in httpOnly cookies + `bcryptjs` password hashing |
| Hosting | Vercel (app) + Supabase (database) — **this is the only supported deployment target for this build** |
| Styling | Plain CSS with responsive breakpoints (no framework dependency) |

## Quick start (local development)

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# then fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET,
# and the NEXT_PUBLIC_* white-label values

# 3. Run the database schema
# Open your Supabase project's SQL Editor and run supabase/schema.sql
# (Updating an EXISTING deployment instead? Run
#  supabase/migration-2-regno-roles-reset.sql — see DEPLOYMENT.md)

# 4. Verify everything is wired up correctly
npm run check-schema

# 5. Start the dev server
npm run dev
```

Then visit `http://localhost:3000` and click **Register** — the first account ever created automatically becomes admin. (If you'd rather create the admin account yourself without using the live registration form, run `npm run bootstrap-admin` instead.)

If anything looks broken, visit `http://localhost:3000/api/health` at any time — it reports exactly which environment variable or database table is missing.

For full step-by-step deployment to a live client (Vercel + Supabase), see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

For how the system is built and why certain decisions were made, see **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

## Project structure

```
orbit-i-pulse/
├── config.ts                 # White-label config — read this first
├── .env.example               # Template for .env.local
├── middleware.ts              # Route protection (auth gate)
├── lib/
│   ├── supabase.ts            # Server-side Supabase client (service role)
│   ├── auth.ts                # JWT sessions, password hashing, role guards
│   ├── ip.ts                  # Client IP extraction for attendance logs
│   ├── csv.ts                 # CSV export helper
│   └── api-client.ts          # Shared fetch wrapper for client components
├── app/
│   ├── layout.tsx
│   ├── globals.css            # Responsive styles
│   ├── login/page.tsx
│   ├── register/page.tsx      # Open self-registration
│   ├── dashboard/
│   │   ├── layout.tsx         # Sidebar shell
│   │   ├── page.tsx           # Overview
│   │   ├── attendance/page.tsx
│   │   ├── reports/page.tsx
│   │   └── team/page.tsx      # Admin/manager: roster, roles, exports
│   └── api/                   # All backend logic — see ARCHITECTURE.md
├── scripts/
│   ├── bootstrap-admin.mjs    # Optional: create the first admin manually
│   └── check-schema.mjs       # Diagnose env vars + database schema issues
├── supabase/
│   ├── schema.sql             # Full database schema
│   └── migration-remove-invites.sql  # For pre-existing projects only
└── public/
    ├── orbit-i-logo.jpg       # Your official ORBIT-I logo (default fallback)
    ├── favicon.ico
    ├── orbit-i-icon-192.png
    └── orbit-i-icon-512.png
```

## Roles

| Role | Can do |
|---|---|
| **intern** | Check in/out, submit daily reports, view own report history |
| **manager** | Everything an intern can do, plus: view & rate their assigned interns' reports, export their team's CSV data |
| **admin** | Everything a manager can do, plus: view/manage all users, reassign interns to managers, promote/demote roles, full CSV export |

## Troubleshooting

**Can't log in or register at all / 500 errors:**
1. Visit `/api/health` — it will tell you exactly which env var or database table is the problem.
2. Run `npm run check-schema` for the same diagnosis from the command line.
3. Most common cause: `JWT_SECRET` is missing from your environment variables. Without it, no session can be created — every login/register attempt fails. Generate one with `openssl rand -base64 32`.
4. Second most common cause: `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is wrong, or you used the `anon` key instead of the `service_role` key. Re-copy both from Supabase → Project Settings → API.
5. Third most common cause: `supabase/schema.sql` was never run. Open Supabase → SQL Editor, paste the full file, click Run.

**404 on the home page (`/`):**
Fixed — `app/page.tsx` exists and renders a branded landing page with Sign In / Register buttons. If you still see a 404, you're likely running an older copy of this codebase; redeploy from this version.

**Invite codes:**
Removed. Registration is open — the first account ever created automatically becomes `admin`; everyone after that starts as `intern` and is promoted from the **Team** page.

## License / Ownership note

This codebase is built to be sold as a one-time purchase per client, white-labeled under each client's brand, with **"Powered by ORBIT-I"** retained as a small footer credit (see `config.ts` → `creditLabel`). Each client deployment is fully standalone — no calls to any ORBIT-I server, no phone-home, no recurring dependency on you after handoff (beyond their own Vercel/Supabase accounts).
