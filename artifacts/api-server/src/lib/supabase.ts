import { createClient } from "@supabase/supabase-js";

function sanitizeSupabaseUrl(raw: string): string {
  try {
    const parsed = new URL(raw);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return raw;
  }
}

export function getSupabaseClient() {
  const rawUrl = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!rawUrl || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are required");
  }
  const url = sanitizeSupabaseUrl(rawUrl);
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
