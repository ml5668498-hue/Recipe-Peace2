import { createClient } from "@supabase/supabase-js";

export function getSupabaseClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are required");
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
