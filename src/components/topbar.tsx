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
    <div className="flex justify-between items-end mb-7">
      <div>
        <h1 className="font-display text-[26px] font-semibold">{title}</h1>
        {subtitle && <p className="text-ink-soft text-sm mt-1">{subtitle}</p>}
      </div>
      <button
        onClick={handleLogout}
        title="Keluar"
        className="w-10 h-10 rounded-full bg-orange-soft border-2 border-orange
                   flex items-center justify-center font-display font-semibold
                   text-orange-deep hover:bg-orange hover:text-white transition-colors"
      >
        {userInitial}
      </button>
    </div>
  );
}
