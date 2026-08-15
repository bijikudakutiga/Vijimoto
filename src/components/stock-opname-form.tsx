"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ProductRow = { id: string; name: string; base_unit: string; system_qty: number };
type HistoryRow = { id: string; opname_date: string; status: string; notes: string | null };

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function StockOpnameForm({
  products,
  history,
}: {
  products: ProductRow[];
  history: HistoryRow[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [opnameDate, setOpnameDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [actuals, setActuals] = useState<Record<string, number>>(() =>
    Object.fromEntries(products.map((p) => [p.id, p.system_qty]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const filtered = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [products, search]
  );

  const totalSelisih = useMemo(
    () =>
      products.reduce((sum, p) => sum + ((actuals[p.id] ?? p.system_qty) - p.system_qty), 0),
    [products, actuals]
  );

  async function handleFinish() {
    setError(null);
    setSaving(true);

    const { data: opname, error: opError } = await supabase
      .from("stock_opname")
      .insert({ opname_date: opnameDate, notes, status: "draft" })
      .select("id")
      .single();

    if (opError || !opname) {
      setError("Gagal membuat sesi opname: " + opError?.message);
      setSaving(false);
      return;
    }

    const itemsPayload = products
      .filter((p) => (actuals[p.id] ?? p.system_qty) !== p.system_qty)
      .map((p) => ({
        opname_id: opname.id,
        product_id: p.id,
        system_qty: p.system_qty,
        actual_qty: actuals[p.id] ?? p.system_qty,
      }));

    if (itemsPayload.length > 0) {
      const { error: itemsError } = await supabase.from("stock_opname_items").insert(itemsPayload);
      if (itemsError) {
        setError("Gagal menyimpan detail opname: " + itemsError.message);
        setSaving(false);
        return;
      }
    }

    // Selesaikan opname -> trigger otomatis menyesuaikan stok sesuai selisih
    const { error: finishError } = await supabase
      .from("stock_opname")
      .update({ status: "selesai" })
      .eq("id", opname.id);

    setSaving(false);
    if (finishError) {
      setError("Opname tersimpan tapi gagal difinalisasi: " + finishError.message);
      return;
    }

    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <div className="card max-w-md">
        <div className="badge-green inline-block text-xs font-bold px-3 py-1 rounded-pill mb-3">
          Opname Selesai
        </div>
        <p className="text-sm text-ink-soft mb-4">
          Stok telah disesuaikan otomatis sesuai selisih hasil hitung fisik.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-orange text-white text-sm font-semibold rounded-pill px-4 py-2"
        >
          Buat Opname Baru
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[1fr_280px] gap-5 items-start">
      <div className="card">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
              Tanggal Opname
            </label>
            <input
              type="date"
              value={opnameDate}
              onChange={(e) => setOpnameDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
              Catatan (opsional)
            </label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
            />
          </div>
        </div>

        <input
          placeholder="Cari produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-line px-3.5 py-2 text-sm w-64 mb-3"
        />

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ink-soft border-b border-line">
                <th className="pb-2 pr-3">Produk</th>
                <th className="pb-2 pr-3">Stok Sistem</th>
                <th className="pb-2 pr-3">Stok Fisik (hasil hitung)</th>
                <th className="pb-2">Selisih</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const actual = actuals[p.id] ?? p.system_qty;
                const diff = actual - p.system_qty;
                return (
                  <tr key={p.id} className="border-b border-line last:border-0">
                    <td className="py-2 pr-3">{p.name}</td>
                    <td className="py-2 pr-3 font-mono text-xs">
                      {p.system_qty} {p.base_unit}
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        value={actual}
                        onChange={(e) =>
                          setActuals((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))
                        }
                        className="w-24 rounded-lg border border-line px-2 py-1 text-xs font-mono"
                      />
                    </td>
                    <td
                      className={`py-2 font-mono text-xs font-bold ${
                        diff > 0 ? "text-status-green-tx" : diff < 0 ? "text-status-red-tx" : "text-ink-soft"
                      }`}
                    >
                      {diff > 0 ? `+${diff}` : diff}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card sticky top-6">
          <div className="font-display text-[15px] font-semibold mb-3">Ringkasan</div>
          <div className="text-sm text-ink-soft mb-1">Total selisih bersih</div>
          <div
            className={`font-display text-2xl font-semibold mb-4 ${
              totalSelisih > 0
                ? "text-status-green-tx"
                : totalSelisih < 0
                ? "text-status-red-tx"
                : "text-ink"
            }`}
          >
            {totalSelisih > 0 ? `+${totalSelisih}` : totalSelisih}
          </div>

          {error && (
            <p className="text-sm text-status-red-tx bg-status-red-bg rounded-lg px-3 py-2 mb-3">
              {error}
            </p>
          )}

          <button
            onClick={handleFinish}
            disabled={saving}
            className="w-full bg-orange hover:bg-orange-deep transition-colors text-white
                       font-semibold text-sm rounded-pill py-2.5 disabled:opacity-60"
          >
            {saving ? "Memproses..." : "Selesaikan Opname"}
          </button>
          <p className="text-[11px] text-ink-soft mt-2">
            Stok akan langsung disesuaikan otomatis sesuai selisih di atas.
          </p>
        </div>

        <div className="card">
          <div className="font-display text-sm font-semibold mb-3">Riwayat Opname</div>
          <div className="space-y-2">
            {history.length === 0 && (
              <p className="text-xs text-ink-soft">Belum ada riwayat opname.</p>
            )}
            {history.map((h) => (
              <div key={h.id} className="text-xs flex justify-between border-b border-line pb-1.5 last:border-0">
                <span>{formatDate(h.opname_date)}</span>
                <span className={h.status === "selesai" ? "text-status-green-tx font-semibold" : "text-ink-soft"}>
                  {h.status === "selesai" ? "Selesai" : "Draft"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
