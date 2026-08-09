# Selling ORBIT-I Pulse as a white-label, one-time-purchase product

This app now has a built-in license system so you can sell it to other
companies as their own branded, licensed copy — without a subscription
server, without a database of licenses to manage, and without any way
for a buyer to forge their own license even if they read the source code.

## How it works (the short version)

- You hold a **private key** on your own computer. Only you can sign
  (issue) valid licenses.
- Every deployment — yours and every client's — ships with the same
  **public key**. It can *verify* a signature but can never *create* one.
- A license is just a small signed string (a `LICENSE_KEY`). The app
  checks it on every request to `/dashboard` and the API — server-side,
  in Middleware, so it can't be bypassed from the browser.
- **Your own deployment stays unaffected.** If `LICENSE_PUBLIC_KEY` isn't
  set, the app treats itself as "internal/unlicensed use" and works
  completely normally — you will never accidentally lock yourself out.

## One-time setup (do this once, ever)

```bash
node scripts/generate-license-keypair.mjs
```

This creates `license-keys/private.pem` and `license-keys/public.pem`
on your computer. That folder is already in `.gitignore` — **never**
commit it, and never send `private.pem` to anyone, ever. Back it up
somewhere safe (password manager, encrypted drive) — if you lose it,
you can't issue new licenses under it (old ones still work, since
verification only needs the public key).

## Selling to a new client

1. Deploy their own copy of the repo to their own Vercel + Supabase
   (or yours, on a subdomain — your choice).
2. Set these environment variables on **their** deployment:
   - `LICENSE_PUBLIC_KEY` — paste the contents of `license-keys/public.pem`
     (same value for every client, forever).
   - `LICENSE_KEY` — unique per client, generated next step.
3. Generate their unique key:
   ```bash
   node scripts/generate-license.mjs "Their Company Name"
   ```
   This prints a `LICENSE_KEY` value and logs it to
   `license-keys/issued-licenses.log` for your own records.
4. Give them that `LICENSE_KEY` value to set as their env var.
5. They (or you, on their behalf) also set their own branding from the
   in-app **Settings** page (admin/CEO/CTO only): company name, logo
   URL, brand colors, support email — no code changes needed.

That's it — their deployment is now licensed to them specifically. If
someone copies their code to a different Supabase/Vercel project
without their own `LICENSE_KEY` + matching `LICENSE_PUBLIC_KEY`, the
app will redirect every dashboard page to `/license-required`.

## What if a client stops paying / support ends?

This is a **one-time-purchase, lifetime license** model — licenses
don't expire on their own (the payload has no expiry check). If you
want to revoke access, options are:
- Simplest: since you control their Supabase project (or they do),
  removing `LICENSE_KEY` from their Vercel env vars locks their
  dashboard immediately.
- If you want expiring/subscription licenses instead, add an
  `expiresAt` field to the payload in `scripts/generate-license.mjs`
  and check it in `lib/license.ts`'s `checkLicense()` — the
  infrastructure is already there, it's a small addition.

## Where the pieces live

| File | Purpose |
|---|---|
| `lib/license.ts` | Verifies a `LICENSE_KEY` against `LICENSE_PUBLIC_KEY`. Runs in Middleware (Edge runtime), so it uses Web Crypto, not Node's `crypto` module. |
| `scripts/generate-license-keypair.mjs` | Run once, ever, by you. Creates your master keypair. |
| `scripts/generate-license.mjs` | Run per client. Signs a new license for them. |
| `middleware.ts` | Blocks `/dashboard` and the API if the license is invalid — server-side, can't be bypassed. |
| `app/license-required/page.tsx` | What a client sees if their license is missing/invalid. |
| `app/dashboard/settings/page.tsx` | In-app white-label branding editor + license status display (admin/CEO/CTO only). |
