"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type SaleOption = { id: string; sale_number: string; sale_date: string; customers: { name: string } | null };
type ReturnRow = {
  id: string;
  return_number: string;
  return_date: string;
  reason: string | null;
  total_amount: number;
  refund_to_cash: boolean;
  sales: { sale_number: string; customers: { name: string } | null } | null;
};
type SaleItemDetail = {
  id: string;
  product_id: string;
  product_name: string;
  unit_name: string;
  qty_sold: number;
  unit_price: number;
};

function formatRupiah(v: number) {
  return "Rp " + Math.round(v).toLocaleString("id-ID");
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function ReturForm({ sales, returns }: { sales: SaleOption[]; returns: ReturnRow[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [saleSearch, setSaleSearch] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [saleItems, setSaleItems] = useState<SaleItemDetail[]>([]);
  const [returnQty, setReturnQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [refundToCash, setRefundToCash] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const filteredSales = useMemo(() => {
    if (!saleSearch) return sales.slice(0, 15);
    return sales
      .filter(
        (s) =>
          s.sale_number.toLowerCase().includes(saleSearch.toLowerCase()) ||
          (s.customers?.name ?? "").toLowerCase().includes(saleSearch.toLowerCase())
      )
      .slice(0, 15);
  }, [sales, saleSearch]);

  async function handleSelectSale(saleId: string) {
    setSelectedSaleId(saleId);
    setSuccess(null);
    setError(null);
    setLoadingItems(true);
    const { data } = await supabase
      .from("sale_items")
      .select("id, product_id, unit_name, qty, unit_price, products ( name )")
      .eq("sale_id", saleId);

    const mapped: SaleItemDetail[] = (data ?? []).map((it: any) => ({
      id: it.id,
      product_id: it.product_id,
      product_name: it.products?.name ?? "-",
      unit_name: it.unit_name,
      qty_sold: it.qty,
      unit_price: it.unit_price,
    }));
    setSaleItems(mapped);
    setReturnQty(Object.fromEntries(mapped.map((it) => [it.id, 0])));
    setLoadingItems(false);
  }

  const totalRefund = saleItems.reduce(
    (sum, it) => sum + (returnQty[it.id] ?? 0) * it.unit_price,
    0
  );

  async function handleSubmit() {
    setError(null);
    const itemsToReturn = saleItems.filter((it) => (returnQty[it.id] ?? 0) > 0);

    if (!selectedSaleId) return setError("Pilih transaksi penjualan dulu.");
    if (itemsToReturn.length === 0) return setError("Isi jumlah retur minimal 1 produk.");
    for (const it of itemsToReturn) {
      if ((returnQty[it.id] ?? 0) > it.qty_sold) {
        return setError(`Jumlah retur "${it.product_name}" melebihi qty yang terjual (${it.qty_sold}).`);
      }
    }

    setSaving(true);

    const { data: retur, error: returError } = await supabase
      .from("returns")
      .insert({
        sale_id: selectedSaleId,
        reason,
        total_amount: totalRefund,
        refund_to_cash: refundToCash,
      })
      .select("id, return_number")
      .single();

    if (returError || !retur) {
      setError("Gagal menyimpan retur: " + returError?.message);
      setSaving(false);
      return;
    }

    const { error: itemsError } = await supabase.from("return_items").insert(
      itemsToReturn.map((it) => ({
        return_id: retur.id,
        product_id: it.product_id,
        unit_name: it.unit_name,
        qty: returnQty[it.id],
        unit_price: it.unit_price,
        subtotal: (returnQty[it.id] ?? 0) * it.unit_price,
      }))
    );

    setSaving(false);
    if (itemsError) {
      setError("Retur tersimpan tapi detail item gagal: " + itemsError.message);
      return;
    }

    setSuccess(`Retur ${retur.return_number} berhasil disimpan. Stok sudah otomatis bertambah kembali.`);
    setSelectedSaleId("");
    setSaleItems([]);
    setReason("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
        <div className="card">
          <div className="font-display text-[15px] font-semibold mb-3">Buat Retur Baru</div>

          {!selectedSaleId ? (
            <>
              <input
                placeholder="Cari no. transaksi / nama customer..."
                value={saleSearch}
                onChange={(e) => setSaleSearch(e.target.value)}
                className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm mb-3"
              />
              <div className="space-y-1 max-h-[360px] overflow-y-auto">
                {filteredSales.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSale(s.id)}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-orange-softer transition-colors"
                  >
                    <div className="text-sm font-semibold font-mono">{s.sale_number}</div>
                    <div className="text-xs text-ink-soft">
                      {s.customers?.name ?? "-"} · {formatDate(s.sale_date)}
                    </div>
                  </button>
                ))}
                {filteredSales.length === 0 && (
                  <p className="text-sm text-ink-soft py-4 text-center">Tidak ada transaksi yang cocok.</p>
                )}
              </div>
            </>
          ) : loadingItems ? (
            <p className="text-sm text-ink-soft py-6 text-center">Memuat detail transaksi...</p>
          ) : (
            <>
              <button
                onClick={() => { setSelectedSaleId(""); setSaleItems([]); }}
                className="text-xs font-semibold text-teal mb-3"
              >
                ← Ganti transaksi
              </button>
              <div className="space-y-2">
                {saleItems.map((it) => (
                  <div key={it.id} className="border border-line rounded-xl p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{it.product_name}</div>
                      <div className="text-xs text-ink-soft">
                        Terjual: {it.qty_sold} {it.unit_name} · {formatRupiah(it.unit_price)}/{it.unit_name}
                      </div>
                    </div>
                    <div className="w-28">
                      <label className="text-[10px] font-semibold text-ink-soft uppercase">Jumlah Retur</label>
                      <input
                        type="number"
                        min={0}
                        max={it.qty_sold}
                        onFocus={(e) => e.target.select()}
                        value={returnQty[it.id] ?? 0}
                        onChange={(e) =>
                          setReturnQty((prev) => ({ ...prev, [it.id]: Number(e.target.value) }))
                        }
                        className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="card lg:sticky lg:top-6">
          <div className="font-display text-[15px] font-semibold mb-4">Ringkasan Retur</div>
          <div>
            <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
              Alasan Retur
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="misal: barang cacat, salah kirim, dll"
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium mt-3">
            <input type="checkbox" checked={refundToCash} onChange={(e) => setRefundToCash(e.target.checked)} />
            Catat otomatis sebagai Kas Keluar (refund)
          </label>

          <div className="border-t border-line mt-4 pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-ink-soft">Total Nilai Retur</span>
              <span className="font-mono font-semibold text-orange-deep">{formatRupiah(totalRefund)}</span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-status-red-tx bg-status-red-bg rounded-lg px-3 py-2 mt-4">{error}</p>
          )}
          {success && (
            <p className="text-sm text-status-green-tx bg-status-green-bg rounded-lg px-3 py-2 mt-4">{success}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving || !selectedSaleId}
            className="w-full bg-orange hover:bg-orange-deep transition-colors text-white
                       font-semibold text-sm rounded-pill py-2.5 mt-4 disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan Retur"}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="font-display text-[15px] font-semibold mb-3">Riwayat Retur</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ink-soft border-b border-line">
                <th className="pb-2 pr-3">No. Retur</th>
                <th className="pb-2 pr-3">Tanggal</th>
                <th className="pb-2 pr-3">Ref. Penjualan</th>
                <th className="pb-2 pr-3">Customer</th>
                <th className="pb-2 pr-3">Alasan</th>
                <th className="pb-2 pr-3">Nilai</th>
                <th className="pb-2">Refund Kas</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="py-2 pr-3 font-mono text-xs font-semibold">{r.return_number}</td>
                  <td className="py-2 pr-3 text-xs">{formatDate(r.return_date)}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{r.sales?.sale_number ?? "-"}</td>
                  <td className="py-2 pr-3 text-xs">{r.sales?.customers?.name ?? "-"}</td>
                  <td className="py-2 pr-3 text-xs text-ink-soft max-w-[160px] truncate">{r.reason ?? "-"}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{formatRupiah(r.total_amount)}</td>
                  <td className="py-2 text-xs">
                    {r.refund_to_cash ? (
                      <span className="badge-green text-[10px] font-bold px-2 py-0.5 rounded-pill">Ya</span>
                    ) : (
                      <span className="text-ink-soft">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {returns.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-ink-soft text-sm">
                    Belum ada riwayat retur.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
