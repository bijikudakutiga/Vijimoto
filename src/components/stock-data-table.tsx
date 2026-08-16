"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Row = {
  id: string;
  name: string;
  sku: string | null;
  base_unit: string;
  price_sell: number;
  price_buy: number;
  min_stock: number;
  qty_on_hand: number;
};

function formatRupiah(v: number) {
  return "Rp " + Math.round(v).toLocaleString("id-ID");
}

function stockStatus(qty: number, min: number) {
  if (qty <= min) return { key: "red", label: "Kritis" };
  if (qty <= min * 1.5) return { key: "amber", label: "Menipis" };
  return { key: "green", label: "Aman" };
}

export function StockDataTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("semua");
  const [sortBy, setSortBy] = useState<"name" | "qty">("name");
  const [editing, setEditing] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);

  const [adjusting, setAdjusting] = useState<Row | null>(null);
  const [newQty, setNewQty] = useState(0);
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = rows.filter((r) =>
      r.name.toLowerCase().includes(search.toLowerCase())
    );
    if (statusFilter !== "semua") {
      list = list.filter((r) => stockStatus(r.qty_on_hand, r.min_stock).key === statusFilter);
    }
    list = [...list].sort((a, b) =>
      sortBy === "name" ? a.name.localeCompare(b.name) : a.qty_on_hand - b.qty_on_hand
    );
    return list;
  }, [rows, search, statusFilter, sortBy]);

  async function handleExport() {
    const XLSX = await import("xlsx");
    const data = filtered.map((r) => {
      const status = stockStatus(r.qty_on_hand, r.min_stock);
      return {
        "Nama Produk": r.name,
        SKU: r.sku ?? "-",
        "Harga Jual": r.price_sell,
        "Harga Beli": r.price_buy,
        "Stok Saat Ini": r.qty_on_hand,
        Satuan: r.base_unit,
        "Min. Stok": r.min_stock,
        Status: status.label,
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Stok");
    XLSX.writeFile(wb, "data-stok.xlsx");
  }

  async function handleSaveEdit() {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from("products")
      .update({
        name: editing.name,
        sku: editing.sku,
        price_sell: editing.price_sell,
        price_buy: editing.price_buy,
        min_stock: editing.min_stock,
      })
      .eq("id", editing.id);
    setSaving(false);
    if (!error) {
      setEditing(null);
      router.refresh();
    }
  }

  function openAdjust(r: Row) {
    setAdjusting(r);
    setNewQty(r.qty_on_hand);
    setAdjustNote("");
    setAdjustError(null);
  }

  async function handleSaveAdjust() {
    if (!adjusting) return;
    const diff = newQty - adjusting.qty_on_hand;
    if (diff === 0) {
      setAdjusting(null);
      return;
    }
    setAdjustSaving(true);
    setAdjustError(null);

    const { error } = await supabase.from("stock_movements").insert({
      product_id: adjusting.id,
      movement_type: "adjustment",
      qty_base: diff,
      reference_type: "manual_input",
      notes: adjustNote || "Ubah stok manual",
    });

    setAdjustSaving(false);
    if (error) {
      setAdjustError("Gagal menyimpan: " + error.message);
      return;
    }
    setAdjusting(null);
    router.refresh();
  }

  return (
    <div className="card">
      <div className="flex flex-wrap gap-2.5 mb-5 items-center justify-between">
        <div className="flex gap-2.5 flex-wrap">
          <input
            placeholder="Cari nama produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-line px-3.5 py-2 text-sm w-56"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-line px-3 py-2 text-sm bg-white"
          >
            <option value="semua">Semua status</option>
            <option value="red">Kritis</option>
            <option value="amber">Menipis</option>
            <option value="green">Aman</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-xl border border-line px-3 py-2 text-sm bg-white"
          >
            <option value="name">Urutkan: Nama</option>
            <option value="qty">Urutkan: Stok Terendah</option>
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
            href="/stok/input"
            className="text-xs font-semibold bg-orange text-white rounded-pill px-4 py-2"
          >
            + Produk Baru
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-ink-soft border-b border-line">
              <th className="pb-2.5 pr-3">Produk</th>
              <th className="pb-2.5 pr-3">Harga Jual</th>
              <th className="pb-2.5 pr-3">Stok Saat Ini</th>
              <th className="pb-2.5 pr-3">Min. Stok</th>
              <th className="pb-2.5 pr-3">Status</th>
              <th className="pb-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const status = stockStatus(r.qty_on_hand, r.min_stock);
              return (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="py-2.5 pr-3">
                    <div className="font-semibold">{r.name}</div>
                    {r.sku && <div className="text-xs text-ink-soft">SKU: {r.sku}</div>}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-xs">{formatRupiah(r.price_sell)}</td>
                  <td className="py-2.5 pr-3 font-mono text-xs">
                    {r.qty_on_hand} {r.base_unit}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-xs text-ink-soft">
                    {r.min_stock} {r.base_unit}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-pill badge-${status.key}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="py-2.5 text-right space-x-3">
                    <button onClick={() => openAdjust(r)} className="text-xs font-semibold text-teal">
                      Ubah Stok
                    </button>
                    <button onClick={() => setEditing(r)} className="text-xs font-semibold text-orange-deep">
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-ink-soft text-sm">
                  Tidak ada produk yang cocok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3">
            <div className="font-display text-lg font-semibold mb-1">Edit Produk</div>
            <div>
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Nama Produk</label>
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">SKU</label>
              <input
                value={editing.sku ?? ""}
                onChange={(e) => setEditing({ ...editing, sku: e.target.value })}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Harga Jual</label>
                <input
                  type="number" onFocus={(e) => e.target.select()} value={editing.price_sell}
                  onChange={(e) => setEditing({ ...editing, price_sell: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Harga Beli</label>
                <input
                  type="number" onFocus={(e) => e.target.select()} value={editing.price_buy}
                  onChange={(e) => setEditing({ ...editing, price_buy: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Ambang Batas Minimum</label>
              <input
                type="number" onFocus={(e) => e.target.select()} value={editing.min_stock}
                onChange={(e) => setEditing({ ...editing, min_stock: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveEdit} disabled={saving}
                className="bg-orange text-white text-sm font-semibold rounded-pill px-4 py-2 disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
              <button onClick={() => setEditing(null)} className="text-sm font-semibold text-ink-soft rounded-pill px-4 py-2">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {adjusting && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-3">
            <div className="font-display text-lg font-semibold">Ubah Stok — {adjusting.name}</div>
            <p className="text-xs text-ink-soft">
              Stok saat ini: <b>{adjusting.qty_on_hand} {adjusting.base_unit}</b>
            </p>
            <div>
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
                Jumlah Stok Baru ({adjusting.base_unit})
              </label>
              <input
                type="number"
                onFocus={(e) => e.target.select()}
                value={newQty}
                onChange={(e) => setNewQty(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
                Catatan (opsional)
              </label>
              <input
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="misal: koreksi input awal"
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
              />
            </div>
            <p className="text-xs text-ink-soft">
              Selisih: <b className={newQty - adjusting.qty_on_hand >= 0 ? "text-status-green-tx" : "text-status-red-tx"}>
                {newQty - adjusting.qty_on_hand >= 0 ? "+" : ""}{newQty - adjusting.qty_on_hand} {adjusting.base_unit}
              </b>
            </p>

            {adjustError && (
              <p className="text-sm text-status-red-tx bg-status-red-bg rounded-lg px-3 py-2">{adjustError}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveAdjust} disabled={adjustSaving}
                className="bg-teal text-white text-sm font-semibold rounded-pill px-4 py-2 disabled:opacity-60"
              >
                {adjustSaving ? "Menyimpan..." : "Simpan Perubahan Stok"}
              </button>
              <button onClick={() => setAdjusting(null)} className="text-sm font-semibold text-ink-soft rounded-pill px-4 py-2">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
