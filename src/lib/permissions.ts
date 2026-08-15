import { createClient } from "@/lib/supabase/server";

export type ModuleKey =
  | "dashboard"
  | "penjualan"
  | "customer"
  | "stok"
  | "kas"
  | "pengaturan";

export type PermissionAction = "view" | "create" | "edit" | "delete" | "approve";

export interface CurrentUser {
  id: string;
  fullName: string;
  email: string;
  roleName: string;
  roleLabel: string;
  isSuperAdmin: boolean;
}

// Ambil profil + role user yang sedang login (dipanggil dari Server Component/layout)
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, roles ( name, label )")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  // roles bisa berupa object tunggal karena relasi 1:1 lewat role_id
  const role = Array.isArray(profile.roles) ? profile.roles[0] : profile.roles;

  return {
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    roleName: role?.name ?? "",
    roleLabel: role?.label ?? "",
    isSuperAdmin: role?.name === "super_admin",
  };
}

// Cek hak akses spesifik — dipakai untuk sembunyikan menu / tombol di UI.
// Keamanan sebenarnya tetap ditegakkan di RLS database (lihat triggers_and_rls.sql),
// jadi ini murni untuk pengalaman UI, bukan satu-satunya lapisan proteksi.
export async function hasPermission(
  moduleKey: ModuleKey,
  action: PermissionAction
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("has_permission", {
    p_module: moduleKey,
    p_action: action,
  });
  if (error) return false;
  return Boolean(data);
}
