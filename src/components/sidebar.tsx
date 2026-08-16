"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

type NavChild = { href: string; label: string };
type NavGroup = { key: string; label: string; href?: string; children?: NavChild[] };

const NAV_ITEMS: NavGroup[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard" },
  {
    key: "penjualan",
    label: "Penjualan",
    children: [
      { href: "/penjualan/input", label: "Input Penjualan" },
      { href: "/penjualan/data", label: "Data Penjualan" },
      { href: "/penjualan/status", label: "Status Transaksi" },
    ],
  },
  {
    key: "customer",
    label: "Customer",
    children: [
      { href: "/customer/data", label: "Data Customer" },
      { href: "/customer/input", label: "Input Data Customer" },
      { href: "/customer/riwayat", label: "Riwayat Customer" },
    ],
  },
  {
    key: "stok",
    label: "Stok Produk",
    children: [
      { href: "/stok/data", label: "Data Stok" },
      { href: "/stok/input", label: "Input Stok" },
      { href: "/stok/opname", label: "Stok Opname" },
    ],
  },
  { key: "kas", label: "Kas", href: "/kas" },
];

const SYSTEM_ITEMS: NavGroup[] = [
  { key: "pengaturan", label: "Pengaturan", href: "/pengaturan/profil" },
];

function GroupItem({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate?: () => void;
}) {
  const isActiveGroup = group.href
    ? pathname.startsWith(group.href)
    : pathname.startsWith(`/${group.key}`);
  const [open, setOpen] = useState(isActiveGroup);

  if (!group.children) {
    return (
      <Link
        href={group.href!}
        onClick={onNavigate}
        className={`nav-item ${isActiveGroup ? "nav-item-active" : ""}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
        {group.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`nav-item w-full justify-between ${isActiveGroup && !open ? "nav-item-active" : ""}`}
      >
        <span className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
          {group.label}
        </span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="ml-4 pl-3 border-l border-white/15 flex flex-col gap-0.5 mt-0.5 mb-1">
          {group.children.map((child) => {
            const activeChild = pathname === child.href || pathname.startsWith(child.href + "/");
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className={`text-[13px] px-3 py-2 rounded-lg transition-colors ${
                  activeChild ? "bg-orange text-white font-semibold" : "text-[#D8CFC5] hover:bg-white/10"
                }`}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="w-[240px] h-full shrink-0 bg-teal text-[#F5EFE8] px-4 py-7 flex flex-col gap-1 overflow-y-auto">
      <div className="flex items-center gap-2.5 pb-6 mb-2.5 border-b border-white/15 px-2">
        <Image
          src="/icons/icon-192.png"
          alt="Vijimoto"
          width={44}
          height={44}
          className="rounded-xl bg-white p-1"
        />
        <div className="font-display text-sm font-semibold leading-tight">
          Vijimoto
          <br />
          Super POS
        </div>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((group) => (
          <GroupItem key={group.key} group={group} pathname={pathname} onNavigate={onNavigate} />
        ))}

        <div className="text-[10px] uppercase tracking-widest opacity-40 font-semibold mt-4 mb-1 px-3.5">
          Sistem
        </div>
        {SYSTEM_ITEMS.map((group) => (
          <GroupItem key={group.key} group={group} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </nav>
    </aside>
  );
}
