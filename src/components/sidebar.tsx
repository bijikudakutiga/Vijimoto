"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", module: "dashboard" },
  { href: "/penjualan/input", label: "Penjualan", module: "penjualan" },
  { href: "/customer/data", label: "Customer", module: "customer" },
  { href: "/stok/data", label: "Stok Produk", module: "stok" },
  { href: "/kas", label: "Kas", module: "kas" },
];

const SYSTEM_ITEMS = [
  { href: "/pengaturan/profil", label: "Pengaturan", module: "pengaturan" },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="w-[230px] h-full shrink-0 bg-teal text-[#F5EFE8] px-4 py-7 flex flex-col gap-1.5 overflow-y-auto">
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
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href.split("/")[1] ? `/${item.href.split("/")[1]}` : item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`nav-item ${active ? "nav-item-active" : ""}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
              {item.label}
            </Link>
          );
        })}

        <div className="text-[10px] uppercase tracking-widest opacity-40 font-semibold mt-4 mb-1 px-3.5">
          Sistem
        </div>
        {SYSTEM_ITEMS.map((item) => {
          const active = pathname.startsWith("/pengaturan");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`nav-item ${active ? "nav-item-active" : ""}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
