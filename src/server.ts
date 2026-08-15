import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Dipakai di Server Components / Server Actions
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Bisa diabaikan jika dipanggil dari Server Component
            // (session akan tetap di-refresh lewat middleware)
          }
        },
      },
    }
  );
}
