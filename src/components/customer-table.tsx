"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Row = {
  id: string;
  name: string;
  pic_name: string | null;
  address: string;
  phone: string;
  email: string | null;
  payment_track: "baik" | "waspada" | "buruk";
  stats: {
    lastOrder: string | null;
    nextDue: string | null;
    totalPurchase: number;
  };
};

const TRACK_LABEL: Record<Row["payment_track"], string> = {
  baik: "Baik",
  waspada: "Waspada",
  buruk: "Buruk",
};

function formatRupiah(v: number) {
  return "Rp " + Math.round(v).toLocaleString("id-ID");
}
function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function CustomerTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [search, setSearch] = useState("");
  const [trackFilter, setTrackFilter] = useState<string>("semua");
  const [sortBy, setSortBy] = useState<"name" | "lastOrder" | "totalPurchase">(
    "name"
  );
  const [editing, setEditing] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    let list = rows.filter((r) =>
      r.name.toLowerCase().includes(search.toLowerCase())
    );
    if (trackFilter !== "semua") {
      list = list.filter((r) => r.payment_track === trackFilter);
    }
    list = [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "lastOrder")
        return (b.stats.lastOrder ?? "").localeCompare(a.stats.lastOrder ?? "");
      return b.stats.totalPurchase - a.stats.totalPurchase;
    });
    return list;
  }, [rows, search, trackFilter, sortBy]);

  async function handleExport() {
    const XLSX = await import("xlsx");
    const data = filtered.map((r) => ({
      "Nama Customer": r.name,
      PIC: r.pic_name ?? "-",
      Alamat: r.address,
      Telepon: r.phone,
      Email: r.email ?? "-",
      "Order Terakhir": formatDate(r.stats.lastOrder),
      "Jatuh Tempo Berikutnya": formatDate(r.stats.nextDue),
      "Total Pembelian": r.stats.totalPurchase,
      "Status Pembayaran": TRACK_LABEL[r.payment_track],
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Customer");
    XLSX.writeFile(wb, "data-customer.xlsx");
  }

  async function handleSaveEdit() {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from("customers")
      .update({
        name: editing.name,
        pic_name: editing.pic_name,
        address: editing.address,
        phone: editing.phone,
        email: editing.email,
      })
      .eq("id", editing.id);
    setSaving(false);
    if (!error) {
      setEditing(null);
      router.refresh();
    }
  }

  return (
    <div className="card">
      <div className="flex flex-wrap gap-2.5 mb-5 items-center justify-between">
        <div className="flex gap-2.5 flex-wrap">
          <input
            placeholder="Cari nama customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-line px-3.5 py-2 text-sm w-56"
          />
          <select
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
            className="rounded-xl border border-line px-3 py-2 text-sm bg-white"
          >
            <option value="semua">Semua status</option>
            <option value="baik">Baik</option>
            <option value="waspada">Waspada</option>
            <option value="buruk">Buruk</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-xl border border-line px-3 py-2 text-sm bg-white"
          >
            <option value="name">Urutkan: Nama</option>
            <option value="lastOrder">Urutkan: Order Terakhir</option>
            <option value="totalPurchase">Urutkan: Total Pembelian</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="text-xs font-semibold bg-orange-soft text-orange-deep rounded-pill px-4 py-2"
          >
            Export Excel
          </button>
          <Link
            href="/customer/input"
            className="text-xs font-semibold bg-orange text-white rounded-pill px-4 py-2"
          >
            + Customer Baru
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-ink-soft border-b border-line">
              <th className="pb-2.5 pr-3">Customer</th>
              <th className="pb-2.5 pr-3">Kontak</th>
              <th className="pb-2.5 pr-3">Order Terakhir</th>
              <th className="pb-2.5 pr-3">Jatuh Tempo Berikutnya</th>
              <th className="pb-2.5 pr-3">Total Pembelian</th>
              <th className="pb-2.5 pr-3">Status</th>
              <th className="pb-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="py-2.5 pr-3">
                  <div className="font-semibold">{r.name}</div>
                  {r.pic_name && (
                    <div className="text-xs text-ink-soft">PIC: {r.pic_name}</div>
                  )}
                </td>
                <td className="py-2.5 pr-3 text-xs text-ink-soft">
                  {r.phone}
                  {r.email && <div>{r.email}</div>}
                </td>
                <td className="py-2.5 pr-3 text-xs">
                  {formatDate(r.stats.lastOrder)}
                </td>
                <td className="py-2.5 pr-3 text-xs">
                  {formatDate(r.stats.nextDue)}
                </td>
                <td className="py-2.5 pr-3 font-mono text-xs">
                  {formatRupiah(r.stats.totalPurchase)}
                </td>
                <td className="py-2.5 pr-3">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-pill badge-${
                      r.payment_track === "baik"
                        ? "green"
                        : r.payment_track === "waspada"
                        ? "amber"
                        : "red"
                    }`}
                  >
                    {TRACK_LABEL[r.payment_track]}
                  </span>
                </td>
                <td className="py-2.5 text-right space-x-3">
                  <a
                    href={`/customer/riwayat?customer=${r.id}`}
                    className="text-xs font-semibold text-teal"
                  >
                    Riwayat
                  </a>
                  <button
                    onClick={() => setEditing(r)}
                    className="text-xs font-semibold text-orange-deep"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-ink-soft text-sm">
                  Tidak ada customer yang cocok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3">
            <div className="font-display text-lg font-semibold mb-1">
              Edit Customer
            </div>
            {(
              [
                ["name", "Nama Customer"],
                ["pic_name", "PIC (opsional)"],
                ["address", "Alamat Lengkap"],
                ["phone", "No. Telepon"],
                ["email", "Email (opsional)"],
              ] as const
            ).map(([field, label]) => (
              <div key={field}>
                <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
                  {label}
                </label>
                <input
                  value={(editing as any)[field] ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, [field]: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
                />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="bg-orange text-white text-sm font-semibold rounded-pill px-4 py-2 disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
              <button
                onClick={() => setEditing(null)}
                className="text-sm font-semibold text-ink-soft rounded-pill px-4 py-2"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
