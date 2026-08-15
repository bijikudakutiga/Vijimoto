import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import { Topbar } from "@/components/topbar";
import { PengaturanTabs } from "@/components/pengaturan-tabs";
import { AccessManagement } from "@/components/access-management";

export default async function ManajemenAksesPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user?.isSuperAdmin) redirect("/pengaturan/profil");

  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, email, is_active, role_id, roles ( name, label )")
    .order("full_name");

  const { data: roles } = await supabase.from("roles").select("id, name, label, is_system").order("label");
  const { data: modules } = await supabase.from("modules").select("id, key, label").order("key");
  const { data: permissions } = await supabase
    .from("role_permissions")
    .select("id, role_id, module_id, can_view, can_create, can_edit, can_delete, can_approve");

  return (
    <>
      <Topbar
        title="Pengaturan"
        subtitle="Kelola profil, log aktivitas, dan hak akses"
        userInitial={user?.fullName?.[0]?.toUpperCase() ?? "U"}
      />
      <PengaturanTabs active="akses" isSuperAdmin={true} />
      <AccessManagement
        users={(users as any) ?? []}
        roles={roles ?? []}
        modules={modules ?? []}
        permissions={permissions ?? []}
      />
    </>
  );
}
