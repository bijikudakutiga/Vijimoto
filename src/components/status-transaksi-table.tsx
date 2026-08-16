"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Row = {
  id: string;
  sale_number: string;
  sale_date: string;
  total: number;
  status: "draft" | "terproses" | "selesai";
  payment_status: "belum_bayar" | "terbayar";
  payment_date: string | null;
  payment_method: string | null;
  shipping_status: "belum_kirim" | "terkirim";
  shipping_date: string | null;
  shipping_courier: string | null;
  customers: { name: string } | null;
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

export function StatusTransaksiTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [payModal, setPayModal] = useState<Row | null>(null);
  const [shipModal, setShipModal] = useState<Row | null>(null);
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState("Transfer Bank");
  const [shipDate, setShipDate] = useState(new Date().toISOString().slice(0, 10));
  const [courier, setCourier] = useState("");
  const [saving, setSaving] = useState(false);

  async function confirmPayment() {
    if (!payModal) return;
    setSaving(true);
    await supabase
      .from("sales")
      .update({
        payment_status: "terbayar",
        payment_date: payDate,
        payment_method: payMethod,
      })
      .eq("id", payModal.id);
    setSaving(false);
    setPayModal(null);
    router.refresh();
  }

  async function confirmShipping() {
    if (!shipModal) return;
    setSaving(true);
    await supabase
      .from("sales")
      .update({
        shipping_status: "terkirim",
        shipping_date: shipDate,
        shipping_courier: courier,
      })
      .eq("id", shipModal.id);
    setSaving(false);
    setShipModal(null);
    router.refresh();
  }

  return (
    <div className="card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-ink-soft border-b border-line">
              <th className="pb-2.5 pr-3">No. Transaksi</th>
              <th className="pb-2.5 pr-3">Customer</th>
              <th className="pb-2.5 pr-3">Total</th>
              <th className="pb-2.5 pr-3">Pembayaran</th>
              <th className="pb-2.5 pr-3">Pengiriman</th>
              <th className="pb-2.5">Status Akhir</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0 align-top">
                <td className="py-3 pr-3">
                  <div className="font-semibold font-mono text-xs">{r.sale_number}</div>
                  <div className="text-[11px] text-ink-soft">{formatDate(r.sale_date)}</div>
                </td>
                <td className="py-3 pr-3">{r.customers?.name ?? "-"}</td>
                <td className="py-3 pr-3 font-mono text-xs">{formatRupiah(r.total)}</td>

                <td className="py-3 pr-3">
                  {r.payment_status === "terbayar" ? (
                    <div className="text-xs">
                      <span className="badge-green text-[10px] font-bold px-2.5 py-1 rounded-pill">
                        Terbayar
                      </span>
                      <div className="text-ink-soft mt-1">
                        {formatDate(r.payment_date)} · {r.payment_method}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-[11px] text-status-red-tx font-semibold mb-1">
                        Belum terbayar
                      </div>
                      <button
                        onClick={() => setPayModal(r)}
                        className="text-[11px] font-semibold bg-orange-soft text-orange-deep rounded-pill px-3 py-1"
                      >
                        Update
                      </button>
                    </div>
                  )}
                </td>

                <td className="py-3 pr-3">
                  {r.shipping_status === "terkirim" ? (
                    <div className="text-xs">
                      <span className="badge-green text-[10px] font-bold px-2.5 py-1 rounded-pill">
                        Terkirim
                      </span>
                      <div className="text-ink-soft mt-1">
                        {formatDate(r.shipping_date)} · {r.shipping_courier}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-[11px] text-status-red-tx font-semibold mb-1">
                        Belum terkirim
                      </div>
                      <button
                        onClick={() => setShipModal(r)}
                        className="text-[11px] font-semibold bg-orange-soft text-orange-deep rounded-pill px-3 py-1"
                      >
                        Update
                      </button>
                    </div>
                  )}
                </td>

                <td className="py-3">
                  {r.status === "selesai" ? (
                    <span className="flex items-center gap-1.5 text-status-green-tx font-semibold text-xs">
                      ✓ Transaksi Selesai
                    </span>
                  ) : (
                    <span className="text-xs text-ink-soft">Terproses</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {payModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-3">
            <div className="font-display text-lg font-semibold">
              Update Pembayaran — {payModal.sale_number}
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
                Tanggal Pembayaran
              </label>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
                Via Pembayaran
              </label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm bg-white"
              >
                <option>Transfer Bank</option>
                <option>Cash</option>
                <option>QRIS</option>
                <option>Giro</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={confirmPayment}
                disabled={saving}
                className="bg-orange text-white text-sm font-semibold rounded-pill px-4 py-2 disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : "Konfirmasi Terbayar"}
              </button>
              <button
                onClick={() => setPayModal(null)}
                className="text-sm font-semibold text-ink-soft rounded-pill px-4 py-2"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {shipModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-3">
            <div className="font-display text-lg font-semibold">
              Update Pengiriman — {shipModal.sale_number}
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
                Tanggal Kirim
              </label>
              <input
                type="date"
                value={shipDate}
                onChange={(e) => setShipDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
                Via Ekspedisi
              </label>
              <input
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                placeholder="JNE, internal, dll"
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={confirmShipping}
                disabled={saving}
                className="bg-orange text-white text-sm font-semibold rounded-pill px-4 py-2 disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : "Konfirmasi Terkirim"}
              </button>
              <button
                onClick={() => setShipModal(null)}
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
