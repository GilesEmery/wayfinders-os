import { measuredSupabaseFetch } from "@/lib/experiences/builder/performance-measurement";
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Supabase server environment variables are not configured.");
  return createClient<Database>(url, secret, {
    global: { fetch: measuredSupabaseFetch },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
