import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// HANYA dipakai di server (Server Actions/Route Handlers), TIDAK PERNAH di client.
// Service role key melewati RLS sepenuhnya — dipakai khusus untuk membuat user
// baru dari menu Manajemen Akses (auth.admin.createUser tidak bisa dipanggil
// dengan anon key).
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
