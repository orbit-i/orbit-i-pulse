# Architecture — ORBIT-I Pulse

This document explains how the system is built and, more importantly, *why* — the tradeoffs that shaped this particular design, so future changes (by you or anyone else) don't accidentally undo decisions that were made deliberately.

---

## High-level shape

```
┌─────────────────────────────────────────────┐
│              Vercel (Next.js)                │
│                                               │
│  ┌─────────────┐        ┌─────────────────┐  │
│  │   App Router │        │  API Routes      │  │
│  │   (React UI) │◄──────►│  (Node backend)  │  │
│  └─────────────┘        └────────┬────────┘  │
│                                   │           │
└───────────────────────────────────┼───────────┘
                                    │ service_role key
                                    ▼
                    ┌───────────────────────────┐
                    │   Supabase (PostgreSQL)    │
                    │   RLS disabled — access    │
                    │   control is enforced in   │
                    │   API routes, not the DB   │
                    └───────────────────────────┘
```

This is a **monolith**: one Next.js codebase serves both the React frontend and the Node.js backend (via API routes). There is no separate backend service, no separate deploy step for "the API" vs "the frontend" — it's all one Vercel deployment. This was a deliberate choice for a product sold as a one-time-purchase deliverable: fewer moving parts means fewer ways for a non-technical client (or whoever maintains it after you) to break the deployment.

---

## Authentication: why local JWT, not Supabase Auth / Auth0 / Clerk

The original requirement was explicit: **no external SaaS dependencies for auth**, so the software runs completely standalone on infrastructure the client (or you, on their behalf) controls.

Concretely, this means:

- Sessions are signed JWTs (`jose` library), stored in an **httpOnly cookie** — never accessible to client-side JavaScript, which mitigates XSS-based token theft.
- Passwords are hashed with `bcryptjs` (cost factor 12) before ever touching the database.
- `middleware.ts` checks for a valid JWT on every request to a protected route and redirects to `/login` (or returns 401 for API routes) if it's missing or invalid.
- **Supabase is used purely as a Postgres host** in this architecture — not as an identity provider. This is an important distinction: even though Supabase happens to *offer* its own Auth product, this app deliberately does not use it, specifically so that switching away from Supabase later (to a self-hosted Postgres instance, for example) would require no changes to the authentication system at all.

### Why this matters for "ownership security"

If this app used Auth0 or Clerk, the client's user accounts and login flow would depend on a third party staying in business, keeping its free tier, or not changing its pricing. With local JWT auth, the *worst case* if you (the seller) disappear entirely is: the client's app keeps working exactly as it did, forever, because there is no external auth dependency to break.

---

## Why Row Level Security (RLS) is disabled

This is the one decision in this codebase most likely to look wrong to someone who knows Supabase well, so it's worth explaining clearly.

Supabase's RLS model is built around `auth.uid()` — a special Postgres function that returns the current user's ID **only when authenticated through Supabase Auth**. Because this app uses its own local JWT system instead, `auth.uid()` is always `NULL` here. Writing RLS policies against a value that's always null would either:

- Block all access (if policies default to deny), or
- Provide no real protection at all (if policies are written permissively to compensate)

Either way, RLS would be theater, not security.

Instead, every database call from the app uses the **`service_role` key**, which bypasses RLS entirely by design, and all access control is enforced explicitly in code via `requireRole()` and `getSession()` in `lib/auth.ts`. Every API route that touches sensitive data checks the caller's role before doing anything. This is the same pattern almost every backend framework uses (Express, Django, Rails) — the database stays "dumb," and the application layer owns authorization.

**The critical invariant this depends on:** `SUPABASE_SERVICE_ROLE_KEY` must never reach the browser. It lives only in server-side environment variables, is read only inside `lib/supabase.ts` (which is never imported by a `"use client"` component), and Vercel keeps it encrypted at rest. If you ever add a new feature, the rule is simple: **never import `lib/supabase.ts` from client code.**

---

## Data model

```
users
  ├─ id, full_name, email, password_hash, role, manager_id, is_active
  │
  ├──< attendance (one row per check-in/out day, unique per user per date)
  │
  └──< daily_reports (one row per user per day, unique constraint enforced in DB)
          └──< performance_reviews (manager's rating + feedback on a report)
```

Key constraints worth knowing about:

- `attendance` has a unique index on `(user_id, check_in::date)` — the database itself prevents two check-ins on the same calendar day, even if the API had a bug that tried to allow it.
- `daily_reports` has a unique constraint on `(user_id, report_date)` for the same reason — one report per person per day, enforced at the data layer, not just in application logic.
- `manager_id` on `users` is a self-referencing foreign key — this is what makes the manager→intern hierarchy work, and it's also why the schema can support an org chart of arbitrary depth later if needed (though the current UI only goes one level deep: manager sees their direct reports).

---

## Role-based access control

Three roles: `admin`, `manager`, `intern`. Permissions are enforced **server-side, in every API route** — not just hidden in the UI. This matters because client-side checks are trivially bypassed (anyone can open dev tools and call an API directly), so:

- `requireRole("admin", "manager")` throws before any database query runs if the caller's JWT role doesn't match.
- The UI *also* hides controls the user isn't allowed to use (e.g., interns don't see a rating button on their own reports) — but this is purely a UX nicety. The actual security boundary is the API route check.

If you ever add a new role or a new permission, the pattern to follow is: **add the check in the API route first**, then adjust the UI to match. Never the other way around.

---

## White-labeling: two separate identities

This is implemented as two distinct concepts in `config.ts`, which is easy to blur together if you're not careful:

| Concept | Source | Visibility |
|---|---|---|
| `companyName`, `logoUrl`, `theme` | `.env.local` per client | Shown everywhere — header, login screen, browser tab title |
| `productName`, `creditLabel` | Hardcoded in `config.ts` | Shown only as a small "Powered by ORBIT-I" footer credit |

The client-facing brand and your (ORBIT-I's) brand are intentionally decoupled. A client buying this software should feel like it's *their* internal tool, not a product they're renting from you — the small credit line is the only visible trace of ORBIT-I, and it's deliberately unobtrusive (small, muted gray text) rather than a logo or banner.

---

## Open registration, with a bootstrap fallback

An earlier version of this app gated registration behind admin-generated invite codes. That added a chicken-and-egg problem (registration needed an invite code, invite codes needed an admin, the admin needed to exist before anyone could register) and turned out to be a common source of "nothing works" deployment failures — a fresh deployment with zero admins and zero invite codes was simply unusable until someone remembered to run a separate bootstrap script.

The current design removes that dependency entirely:

- `/register` is open. Anyone with the URL can create an account.
- The **first account ever created** (checked via a `SELECT COUNT(*) FROM users` in `app/api/auth/register/route.ts`) is automatically given the `admin` role. Every account after that defaults to `intern`.
- Admins promote people to `manager` or `admin` afterward from the **Team** page (`PATCH /api/users/[id]/role`), and assign interns to managers from the same page (`PATCH /api/users/[id]/assign-manager`).
- `scripts/bootstrap-admin.mjs` still exists as an optional alternative — useful if you want to control exactly who becomes the first admin (with a specific email/password) rather than whoever happens to load the live site first.

This trades away the invite system's built-in spam/access control (anyone who finds the URL can sign up) for deployment reliability. Since each client deployment is private infrastructure handed to a specific company rather than a public product, this tradeoff favors "it works the moment you deploy it" over "registration is locked down by default." If a client specifically wants registration gated again later, the invite-code system can be re-added without touching the rest of the schema — it was a self-contained addition, not load-bearing for anything else.

---

## Diagnosing a broken deployment: /api/health and check-schema

Two tools exist specifically to turn "login doesn't work" into a specific, actionable answer instead of a guessing game:

- **`GET /api/health`** — checks that `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `JWT_SECRET` are all set, then attempts a real query against the `users` table to confirm the schema has actually been run. Visit it in a browser at any time, on any deployment, with no auth required.
- **`npm run check-schema`** — the same checks, run from the command line against your local `.env.local`, useful before you've even started the dev server.

Both exist because the most common failure mode for this kind of app isn't a logic bug — it's a missing or misnamed environment variable, or a schema that was never run. Before these tools existed, that failure surfaced as a generic "Invalid credentials" on login or a raw `TypeError: fetch failed` on register, which looked like a credentials problem or a crash rather than what it actually was: a configuration problem. `lib/auth.ts`, `lib/supabase.ts`, and `middleware.ts` now also throw an immediate, named error at startup if `JWT_SECRET`, `SUPABASE_URL`, or `SUPABASE_SERVICE_ROLE_KEY` is missing, rather than failing silently deep inside a library call.

If you're debugging a "nothing works" report from a client, **check `/api/health` first** — it answers the most common root causes in one request.

---

## Responsive design approach

Inline React `style={}` objects cannot express CSS media queries — this is a hard limitation of the platform, not a stylistic choice. Once mobile support became a requirement, layout-critical styling moved into `app/globals.css` using real class names (`.dash-shell`, `.card`, `.btn`, etc.) so a single `@media (max-width: 768px)` block can restyle the entire app at once.

The sidebar becomes a horizontally-scrollable top bar on mobile rather than a hamburger menu with toggle state — this was a deliberate simplicity tradeoff. A hamburger menu needs JavaScript state, an open/close animation, and a way to dismiss it on navigation; a horizontally-scrollable nav needs none of that and degrades gracefully even if JavaScript is slow to hydrate.

---

## What would need to change to scale this beyond "one client per deployment"

This architecture is intentionally **not** multi-tenant — each client gets a fully separate Vercel + Supabase pair. If you ever wanted a single shared deployment serving many clients (a true SaaS model instead of one-time-sale-per-client), you would need to:

1. Add a `company_id` / `tenant_id` column to every table and filter every query by it.
2. Re-introduce RLS, but properly — likely by switching to Supabase Auth (or embedding tenant ID directly into the local JWT and checking it against `company_id` in every API route, which is more code but keeps the local-auth architecture).
3. Move white-label config (`companyName`, `logoUrl`, theme colors) out of environment variables and into the `company_settings` database table, looked up per request based on subdomain or custom domain.

This is explicitly **out of scope** for the current build, which was designed around the one-time-purchase, fully-isolated-per-client model.
