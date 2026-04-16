import { createClient } from "@supabase/supabase-js";

// Returns a singleton Supabase client using the service role key 
// (For Edge Functions / Admin API routes where we bypass RLS or handle our own DB setup)
export function createAdminSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Returns a singleton Supabase client using the anon key
// Since RLS is enabled, queries from the browser or standard server components 
// won't inherently see data unless you use Supabase auth or we do manual lookups 
// based on clerk_user_id (which is how this app is architected).
export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
