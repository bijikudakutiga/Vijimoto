import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import { Topbar } from "@/components/topbar";
import { PengaturanTabs } from "@/components/pengaturan-tabs";
import { ActivityLogTable } from "@/components/activity-log-table";

export default async function LogAktivitasPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: logs } = await supabase
    .from("activity_logs")
    .select("id, action, module, description, created_at, profiles ( full_name )")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <Topbar
        title="Pengaturan"
        subtitle="Kelola profil, log aktivitas, dan hak akses"
        userInitial={user?.fullName?.[0]?.toUpperCase() ?? "U"}
      />
      <PengaturanTabs active="log" isSuperAdmin={user?.isSuperAdmin ?? false} />
      <ActivityLogTable rows={(logs as any) ?? []} />
    </>
  );
}
