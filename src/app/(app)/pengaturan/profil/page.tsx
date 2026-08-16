import { getCurrentUser } from "@/lib/permissions";
import { Topbar } from "@/components/topbar";
import { ProfileForm } from "@/components/profile-form";
import { PengaturanTabs } from "@/components/pengaturan-tabs";

export default async function ProfilPage() {
  const user = await getCurrentUser();
  return (
    <>
      <Topbar
        title="Pengaturan"
        subtitle="Kelola profil, log aktivitas, dan hak akses"
        userInitial={user?.fullName?.[0]?.toUpperCase() ?? "U"}
      />
      <PengaturanTabs active="profil" isSuperAdmin={user?.isSuperAdmin ?? false} />
      <ProfileForm
        fullName={user?.fullName ?? ""}
        email={user?.email ?? ""}
        roleLabel={user?.roleLabel ?? ""}
      />
    </>
  );
}
