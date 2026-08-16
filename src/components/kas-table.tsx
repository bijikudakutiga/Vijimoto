"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Row = {
  id: string;
  type: "masuk" | "keluar";
  category: string | null;
  amount: number;
  description: string | null;
  transaction_date: string;
};

function formatRupiah(v: number) {
  return "Rp " + Math.round(v).toLocaleString("id-ID");
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

const emptyForm = {
  type: "masuk" as "masuk" | "keluar",
  category: "",
  amount: 0,
  description: "",
  transaction_date: new Date().toISOString().slice(0, 10),
};

export function KasTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [typeFilter, setTypeFilter] = useState("semua");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchType = typeFilter === "semua" || r.type === typeFilter;
      const matchFrom = !dateFrom || r.transaction_date >= dateFrom;
      const matchTo = !dateTo || r.transaction_date <= dateTo;
      return matchType && matchFrom && matchTo;
    });
  }, [rows, typeFilter, dateFrom, dateTo]);

  const totalMasuk = filtered.filter((r) => r.type === "masuk").reduce((s, r) => s + Number(r.amount), 0);
  const totalKeluar = filtered.filter((r) => r.type === "keluar").reduce((s, r) => s + Number(r.amount), 0);
  const saldo = totalMasuk - totalKeluar;

  function openAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  }
  function openEdit(r: Row) {
    setForm({
      type: r.type,
      category: r.category ?? "",
      amount: r.amount,
      description: r.description ?? "",
      transaction_date: r.transaction_date,
    });
    setEditingId(r.id);
    setModalOpen(true);
  }

  async function handleSave() {
    setError(null);
    if (!form.amount || form.amount <= 0) return setError("Jumlah harus lebih dari 0.");

    setSaving(true);
    const payload = {
      type: form.type,
      category: form.category || null,
      amount: form.amount,
      description: form.description || null,
      transaction_date: form.transaction_date,
    };

    const { error } = editingId
      ? await supabase.from("cash_transactions").update(payload).eq("id", editingId)
      : await supabase.from("cash_transactions").insert(payload);

    setSaving(false);
    if (error) return setError("Gagal menyimpan: " + error.message);

    setModalOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-[11px] uppercase tracking-wide font-bold text-ink-soft mb-1.5">Total Kas Masuk</div>
          <div className="font-display text-xl font-semibold text-status-green-tx">{formatRupiah(totalMasuk)}</div>
        </div>
        <div className="card">
          <div className="text-[11px] uppercase tracking-wide font-bold text-ink-soft mb-1.5">Total Kas Keluar</div>
          <div className="font-display text-xl font-semibold text-status-red-tx">{formatRupiah(totalKeluar)}</div>
        </div>
        <div className="card bg-gradient-to-br from-orange to-orange-deep text-white border-none">
          <div className="text-[11px] uppercase tracking-wide font-bold text-[#FFE4D6] mb-1.5">Saldo</div>
          <div className="font-display text-xl font-semibold">{formatRupiah(saldo)}</div>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-2.5 mb-5 items-center justify-between">
          <div className="flex gap-2.5 flex-wrap items-center">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-line px-3 py-2 text-sm bg-white"
            >
              <option value="semua">Semua tipe</option>
              <option value="masuk">Kas Masuk</option>
              <option value="keluar">Kas Keluar</option>
            </select>
            <div className="flex items-center gap-1.5 text-xs text-ink-soft">
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-xl border border-line px-2.5 py-2 text-sm" />
              s/d
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="rounded-xl border border-line px-2.5 py-2 text-sm" />
            </div>
          </div>
          <button onClick={openAdd} className="text-xs font-semibold bg-orange text-white rounded-pill px-4 py-2">
            + Catat Transaksi
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ink-soft border-b border-line">
                <th className="pb-2.5 pr-3">Tanggal</th>
                <th className="pb-2.5 pr-3">Tipe</th>
                <th className="pb-2.5 pr-3">Kategori</th>
                <th className="pb-2.5 pr-3">Keterangan</th>
                <th className="pb-2.5 pr-3">Jumlah</th>
                <th className="pb-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="py-2.5 pr-3 text-xs">{formatDate(r.transaction_date)}</td>
                  <td className="py-2.5 pr-3">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-pill ${r.type === "masuk" ? "badge-green" : "badge-red"}`}>
                      {r.type === "masuk" ? "Masuk" : "Keluar"}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-xs">{r.category ?? "-"}</td>
                  <td className="py-2.5 pr-3 text-xs text-ink-soft">{r.description ?? "-"}</td>
                  <td className={`py-2.5 pr-3 font-mono text-xs font-bold ${r.type === "masuk" ? "text-status-green-tx" : "text-status-red-tx"}`}>
                    {r.type === "masuk" ? "+" : "-"} {formatRupiah(r.amount)}
                  </td>
                  <td className="py-2.5 text-right">
                    <button onClick={() => openEdit(r)} className="text-xs font-semibold text-orange-deep">Edit</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-ink-soft text-sm">Belum ada transaksi kas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-3">
            <div className="font-display text-lg font-semibold">
              {editingId ? "Edit Transaksi Kas" : "Catat Transaksi Kas"}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setForm({ ...form, type: "masuk" })}
                className={`flex-1 text-sm font-semibold rounded-xl py-2 border ${form.type === "masuk" ? "bg-status-green-bg border-status-green-bd text-status-green-tx" : "border-line text-ink-soft"}`}
              >
                Kas Masuk
              </button>
              <button
                onClick={() => setForm({ ...form, type: "keluar" })}
                className={`flex-1 text-sm font-semibold rounded-xl py-2 border ${form.type === "keluar" ? "bg-status-red-bg border-status-red-bd text-status-red-tx" : "border-line text-ink-soft"}`}
              >
                Kas Keluar
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Tanggal</label>
              <input type="date" value={form.transaction_date}
                onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Kategori</label>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Pelunasan customer, operasional, gaji, dll"
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Jumlah (Rp)</label>
              <input type="number" onFocus={(e) => e.target.select()} min={0} value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Keterangan</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm" />
            </div>

            {error && <p className="text-sm text-status-red-tx bg-status-red-bg rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-2 pt-2">
              <button onClick={handleSave} disabled={saving}
                className="bg-orange text-white text-sm font-semibold rounded-pill px-4 py-2 disabled:opacity-60">
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
              <button onClick={() => setModalOpen(false)} className="text-sm font-semibold text-ink-soft rounded-pill px-4 py-2">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
