"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Row = {
  id: string;
  sale_number: string;
  sale_date: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  status: "draft" | "terproses" | "selesai";
  payment_status: "belum_bayar" | "terbayar";
  shipping_status: "belum_kirim" | "terkirim";
  is_locked: boolean;
  customers: { name: string } | null;
};

function formatRupiah(v: number) {
  return "Rp " + Math.round(v).toLocaleString("id-ID");
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function DataPenjualanTable({ rows }: { rows: Row[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("semua");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortDesc, setSortDesc] = useState(true);

  const filtered = useMemo(() => {
    let list = rows.filter((r) => {
      const matchSearch =
        r.sale_number.toLowerCase().includes(search.toLowerCase()) ||
        (r.customers?.name ?? "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "semua" || r.status === statusFilter;
      const matchFrom = !dateFrom || r.sale_date >= dateFrom;
      const matchTo = !dateTo || r.sale_date <= dateTo;
      return matchSearch && matchStatus && matchFrom && matchTo;
    });
    list = [...list].sort((a, b) =>
      sortDesc
        ? b.sale_date.localeCompare(a.sale_date)
        : a.sale_date.localeCompare(b.sale_date)
    );
    return list;
  }, [rows, search, statusFilter, dateFrom, dateTo, sortDesc]);

  async function handleExport(scope: "filtered" | "all") {
    const XLSX = await import("xlsx");
    const source = scope === "filtered" ? filtered : rows;

    const data = source.map((r) => ({
      "No. Transaksi": r.sale_number,
      Tanggal: formatDate(r.sale_date),
      Customer: r.customers?.name ?? "-",
      Subtotal: r.subtotal,
      Diskon: r.discount_amount,
      Pajak: r.tax_amount,
      Total: r.total,
      Status: r.status,
      Pembayaran: r.payment_status === "terbayar" ? "Terbayar" : "Belum Bayar",
      Pengiriman: r.shipping_status === "terkirim" ? "Terkirim" : "Belum Kirim",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Penjualan");
    const filename =
      scope === "filtered" && (dateFrom || dateTo)
        ? `data-penjualan_${dateFrom || "awal"}_sd_${dateTo || "akhir"}.xlsx`
        : "data-penjualan_semua.xlsx";
    XLSX.writeFile(wb, filename);
  }

  return (
    <div className="card">
      <div className="flex flex-wrap gap-2.5 mb-5 items-center justify-between">
        <div className="flex gap-2.5 flex-wrap items-center">
          <input
            placeholder="Cari no. transaksi / customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-line px-3.5 py-2 text-sm w-64"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-line px-3 py-2 text-sm bg-white"
          >
            <option value="semua">Semua status</option>
            <option value="terproses">Terproses</option>
            <option value="selesai">Selesai</option>
          </select>
          <div className="flex items-center gap-1.5 text-xs text-ink-soft">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-xl border border-line px-2.5 py-2 text-sm"
            />
            s/d
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-xl border border-line px-2.5 py-2 text-sm"
            />
          </div>
          <button
            onClick={() => setSortDesc(!sortDesc)}
            className="text-xs font-semibold text-ink-soft border border-line rounded-pill px-3 py-2"
          >
            Tanggal {sortDesc ? "↓ Terbaru" : "↑ Terlama"}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleExport("filtered")}
            className="text-xs font-semibold bg-orange-soft text-orange-deep rounded-pill px-3.5 py-2"
          >
            Export Sesuai Filter
          </button>
          <button
            onClick={() => handleExport("all")}
            className="text-xs font-semibold bg-orange text-white rounded-pill px-3.5 py-2"
          >
            Export Semua ke Excel
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-ink-soft border-b border-line">
              <th className="pb-2.5 pr-3">No. Transaksi</th>
              <th className="pb-2.5 pr-3">Tanggal</th>
              <th className="pb-2.5 pr-3">Customer</th>
              <th className="pb-2.5 pr-3">Total</th>
              <th className="pb-2.5 pr-3">Status</th>
              <th className="pb-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="py-2.5 pr-3 font-mono text-xs font-semibold">
                  {r.sale_number}
                </td>
                <td className="py-2.5 pr-3 text-xs">{formatDate(r.sale_date)}</td>
                <td className="py-2.5 pr-3">{r.customers?.name ?? "-"}</td>
                <td className="py-2.5 pr-3 font-mono text-xs">
                  {formatRupiah(r.total)}
                </td>
                <td className="py-2.5 pr-3">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-pill ${
                      r.status === "selesai" ? "badge-green" : "badge-amber"
                    }`}
                  >
                    {r.status === "selesai" ? "Selesai" : "Terproses"}
                  </span>
                </td>
                <td className="py-2.5 text-right">
                  {r.is_locked ? (
                    <span className="text-[11px] text-ink-soft italic">Terkunci</span>
                  ) : (
                    <Link
                      href={`/penjualan/data/${r.id}/edit`}
                      className="text-xs font-semibold text-orange-deep"
                    >
                      Edit
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-ink-soft text-sm">
                  Tidak ada transaksi yang cocok dengan filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
