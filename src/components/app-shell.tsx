"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Topbar khusus mobile: tombol hamburger + logo kecil */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-teal flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Buka menu"
          className="text-[#F5EFE8] w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
        </button>
        <span className="text-[#F5EFE8] font-display font-semibold text-sm">Vijimoto Super POS</span>
      </div>

      {/* Overlay gelap saat sidebar mobile terbuka */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar: selalu tampil di desktop (md ke atas), jadi drawer geser di mobile */}
      <div
        className={`fixed md:static top-0 left-0 z-50 h-full transition-transform duration-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        <Sidebar onNavigate={() => setMobileOpen(false)} />
      </div>

      <main className="flex-1 px-5 md:px-10 py-8 pt-20 md:pt-8 overflow-x-hidden w-full">
        {children}
      </main>
    </div>
  );
}
