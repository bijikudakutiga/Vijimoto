"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Customer = { id: string; name: string; pic_name: string | null; payment_track: "baik" | "waspada" | "buruk" };
type Sale = {
  id: string;
  sale_number: string;
  sale_date: string;
  total: number;
  status: "draft" | "terproses" | "selesai";
  payment_status: "belum_bayar" | "terbayar";
  payment_date: string | null;
  shipping_status: "belum_kirim" | "terkirim";
  shipping_date: string | null;
  due_date: string;
};

const TRACK_LABEL: Record<Customer["payment_track"], string> = {
  baik: "Baik",
  waspada: "Waspada",
  buruk: "Buruk",
};

function formatRupiah(v: number) {
  return "Rp " + Math.round(v).toLocaleString("id-ID");
}
function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function CustomerRiwayat({
  customers,
  selectedCustomerId,
  selectedCustomer,
  sales,
}: {
  customers: Customer[];
  selectedCustomerId: string;
  selectedCustomer: Customer | null;
  sales: Sale[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filteredCustomers = useMemo(
    () => customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [customers, search]
  );

  const totalPembelian = sales.reduce((s, r) => s + Number(r.total), 0);
  const totalTransaksi = sales.length;
  const rataRata = totalTransaksi ? totalPembelian / totalTransaksi : 0;

  function selectCustomer(id: string) {
    router.push(`/customer/riwayat?customer=${id}`);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-5 items-start">
      <div className="card">
        <input
          placeholder="Cari customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-line px-3.5 py-2 text-sm mb-3"
        />
        <div className="space-y-1 max-h-[520px] overflow-y-auto">
          {filteredCustomers.map((c) => (
            <button
              key={c.id}
              onClick={() => selectCustomer(c.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                selectedCustomerId === c.id ? "bg-orange text-white" : "hover:bg-orange-softer"
              }`}
            >
              <div className="font-medium">{c.name}</div>
              {c.pic_name && (
                <div className={`text-xs ${selectedCustomerId === c.id ? "text-white/80" : "text-ink-soft"}`}>
                  PIC: {c.pic_name}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {!selectedCustomer ? (
          <div className="card text-center py-12 text-sm text-ink-soft">
            Pilih customer di sebelah kiri untuk melihat riwayat transaksinya.
          </div>
        ) : (
          <>
            <div className="card">
              <div className="flex justify-between items-start mb-1">
                <div className="font-display text-xl font-semibold">{selectedCustomer.name}</div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-pill badge-${
                  selectedCustomer.payment_track === "baik" ? "green" : selectedCustomer.payment_track === "waspada" ? "amber" : "red"
                }`}>
                  {TRACK_LABEL[selectedCustomer.payment_track]}
                </span>
              </div>
              {selectedCustomer.pic_name && (
                <div className="text-sm text-ink-soft">PIC: {selectedCustomer.pic_name}</div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card">
                <div className="text-[11px] uppercase tracking-wide font-bold text-ink-soft mb-1.5">Total Pembelian</div>
                <div className="font-display text-xl font-semibold text-orange-deep">{formatRupiah(totalPembelian)}</div>
              </div>
              <div className="card">
                <div className="text-[11px] uppercase tracking-wide font-bold text-ink-soft mb-1.5">Jumlah Transaksi</div>
                <div className="font-display text-xl font-semibold">{totalTransaksi}</div>
              </div>
              <div className="card">
                <div className="text-[11px] uppercase tracking-wide font-bold text-ink-soft mb-1.5">Rata-rata / Transaksi</div>
                <div className="font-display text-xl font-semibold">{formatRupiah(rataRata)}</div>
              </div>
            </div>

            <div className="card">
              <div className="font-display text-[15px] font-semibold mb-4">Riwayat Transaksi</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-ink-soft border-b border-line">
                    <th className="pb-2.5 pr-3">No. Transaksi</th>
                    <th className="pb-2.5 pr-3">Tanggal</th>
                    <th className="pb-2.5 pr-3">Total</th>
                    <th className="pb-2.5 pr-3">Pembayaran</th>
                    <th className="pb-2.5">Pengiriman</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => (
                    <tr key={s.id} className="border-b border-line last:border-0">
                      <td className="py-2.5 pr-3 font-mono text-xs font-semibold">{s.sale_number}</td>
                      <td className="py-2.5 pr-3 text-xs">{formatDate(s.sale_date)}</td>
                      <td className="py-2.5 pr-3 font-mono text-xs">{formatRupiah(s.total)}</td>
                      <td className="py-2.5 pr-3">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-pill ${s.payment_status === "terbayar" ? "badge-green" : "badge-red"}`}>
                          {s.payment_status === "terbayar" ? `Terbayar ${formatDate(s.payment_date)}` : "Belum Bayar"}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-pill ${s.shipping_status === "terkirim" ? "badge-green" : "badge-amber"}`}>
                          {s.shipping_status === "terkirim" ? `Terkirim ${formatDate(s.shipping_date)}` : "Belum Kirim"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {sales.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-ink-soft text-sm">
                        Customer ini belum memiliki riwayat transaksi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
