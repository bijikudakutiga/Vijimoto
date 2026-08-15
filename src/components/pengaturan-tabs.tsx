"use client";

import Link from "next/link";

const TABS = [
  { href: "/pengaturan/profil", label: "Profil", key: "profil" },
  { href: "/pengaturan/log-aktivitas", label: "Riwayat Log Aktivitas", key: "log" },
  { href: "/pengaturan/manajemen-akses", label: "Manajemen Akses", key: "akses", superAdminOnly: true },
];

export function PengaturanTabs({
  active,
  isSuperAdmin,
}: {
  active: string;
  isSuperAdmin: boolean;
}) {
  return (
    <div className="flex gap-2 mb-5 border-b border-line pb-3">
      {TABS.filter((t) => !t.superAdminOnly || isSuperAdmin).map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`text-sm font-semibold px-4 py-2 rounded-pill ${
            active === t.key ? "bg-orange text-white" : "text-ink-soft hover:bg-orange-soft"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
