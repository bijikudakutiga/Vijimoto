"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function Topbar({
  title,
  subtitle,
  userInitial,
}: {
  title: string;
  subtitle?: string;
  userInitial: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex justify-between items-start md:items-end mb-6 md:mb-7 gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-xl md:text-[26px] font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="text-ink-soft text-xs md:text-sm mt-1">{subtitle}</p>}
      </div>
      <button
        onClick={handleLogout}
        title="Keluar"
        className="w-9 h-9 md:w-10 md:h-10 shrink-0 rounded-full bg-orange-soft border-2 border-orange
                   flex items-center justify-center font-display font-semibold text-sm md:text-base
                   text-orange-deep hover:bg-orange hover:text-white transition-colors"
      >
        {userInitial}
      </button>
    </div>
  );
}
