import { createClient } from "@supabase/supabase-js";

function sanitizeSupabaseUrl(raw: string): string {
  try {
    const parsed = new URL(raw);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return raw;
  }
}

/**
 * Returns true when the service role key is configured.
 * Admin operations (auth.admin.*) require service role.
 * Regular operations (auth.signInWithPassword, public table reads) work with the anon key.
 */
export function hasServiceRole(): boolean {
  return Boolean(process.env["SUPABASE_SERVICE_ROLE_KEY"]);
}

/**
 * Returns a Supabase client.
 * Uses SUPABASE_SERVICE_ROLE_KEY when available (full admin access),
 * falls back to SUPABASE_ANON_KEY for user-facing operations.
 */
export function getSupabaseClient() {
  const rawUrl = process.env["SUPABASE_URL"];
  if (!rawUrl) {
    throw new Error("SUPABASE_URL env var is required");
  }

  const key =
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
    process.env["SUPABASE_ANON_KEY"];

  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY env var is required",
    );
  }

  const url = sanitizeSupabaseUrl(rawUrl);
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
