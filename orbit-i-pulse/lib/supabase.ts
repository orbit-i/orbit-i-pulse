// lib/supabase.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy singleton — created on first API call, not at module load.
// This prevents build-time failures when env vars aren't set locally.
// On Vercel, set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in
// Project Settings → Environment Variables.
let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("Missing SUPABASE_URL env var.");
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY env var.");
  _client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _client;
}

// Named alias used throughout codebase — call getSupabaseAdmin() at
// request time rather than at import time to preserve build-time safety.
export const supabaseAdmin = {
  get from() { return getSupabaseAdmin().from.bind(getSupabaseAdmin()); },
  get rpc() { return getSupabaseAdmin().rpc.bind(getSupabaseAdmin()); },
  get auth() { return getSupabaseAdmin().auth; },
  get storage() { return getSupabaseAdmin().storage; },
};
