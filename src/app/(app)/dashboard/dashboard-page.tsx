import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import { Topbar } from "@/components/topbar";
import { SalesTrendChart, StockStatusDonut } from "@/components/dashboard-charts";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

function formatRupiah(value: number) {
  return "Rp " + Math.round(value).toLocaleString("id-ID");
}
function stockStatus(qty: number, min: number) {
  if (qty <= min) return { key: "red", label: "Kritis" };
  if (qty <= min * 1.5) return { key: "amber", label: "Menipis" };
  return { key: "green", label: "Aman" };
}

// Pembatas bagian: garis elegan + label oval kecil miring, warna beda per kategori
function SectionDivider({
  label,
  colorBg,
  colorText,
}: {
  label: string;
  colorBg: string;
  colorText: string;
}) {
  return (
    <div className="relative flex items-center my-7">
      <div className="flex-1 border-t border-line" />
      <span
        className="mx-3 shrink-0 italic text-[11px] font-semibold px-3.5 py-1 rounded-pill"
        style={{ background: colorBg, color: colorText }}
      >
        {label}
      </span>
      <div className="flex-1 border-t border-line" />
    </div>
  );
}

// Baris ringkasan uang: label kiri, nominal kanan — dijamin tidak pecah aneh
// walau nominalnya besar (stack ke bawah otomatis di layar sempit).
function MoneyRow({ label, sub, amount, tone }: { label: string; sub?: string; amount: string; tone?: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-0.5 py-1.5 border-b border-line last:border-0">
      <span className="text-xs text-ink-soft truncate">
        {label}
        {sub && <span className="opacity-70"> · <span className="font-mono">{sub}</span></span>}
      </span>
      <span className={`font-mono text-xs font-semibold whitespace-nowrap ${tone ?? ""}`}>{amount}</span>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const today = new Date();
  const monthStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthStart = monthStartDate.toISOString().slice(0, 10);

  const { data: salesThisMonth } = await supabase
    .from("sales")
    .select("total, sale_date")
    .gte("sale_date", monthStart);
  const totalSalesThisMonth =
    salesThisMonth?.reduce((sum, s) => sum + Number(s.total), 0) ?? 0;

  const dailyMap = new Map<string, number>();
  for (let d = new Date(monthStartDate); d <= today; d.setDate(d.getDate() + 1)) {
    dailyMap.set(format(new Date(d), "d/M"), 0);
  }
  for (const s of salesThisMonth ?? []) {
    const key = format(new Date(s.sale_date), "d/M");
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + Number(s.total));
  }
  const trendData = Array.from(dailyMap, ([date, total]) => ({ date, total }));

  const { data: unpaidList } = await supabase
    .from("sales")
    .select("sale_number, total, customers ( name )")
    .eq("payment_status", "belum_bayar")
    .order("total", { ascending: false })
    .limit(4);
  const { data: unshippedList } = await supabase
    .from("sales")
    .select("sale_number, total, customers ( name )")
    .eq("shipping_status", "belum_kirim")
    .order("total", { ascending: false })
    .limit(4);
  const totalUnpaid = unpaidList?.reduce((s, r) => s + Number(r.total), 0) ?? 0;
  const totalUnshipped = unshippedList?.reduce((s, r) => s + Number(r.total), 0) ?? 0;

  const { data: dueList } = await supabase
    .from("sales")
    .select("sale_number, total, due_date, customers ( name )")
    .eq("payment_status", "belum_bayar")
    .order("due_date", { ascending: true })
    .limit(5);

  function dueStatus(dueDate: string) {
    const diffDays = Math.ceil((new Date(dueDate).getTime() - today.getTime()) / 86400000);
    if (diffDays < 0) return { key: "red", label: "Terlambat" };
    if (diffDays <= 7) return { key: "amber", label: "Segera" };
    return { key: "green", label: "Aman" };
  }

  const { data: products } = await supabase
    .from("products")
    .select("id, name, base_unit, min_stock, product_stock ( qty_on_hand )")
    .eq("is_active", true)
    .order("name");

  const stockRows = (products ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    base_unit: p.base_unit,
    min_stock: p.min_stock,
    qty: p.product_stock?.qty_on_hand ?? 0,
  }));
  const criticalStock = stockRows.filter((p) => p.qty <= p.min_stock);
  const stockDonutData = [
    { name: "Aman", value: stockRows.filter((p) => stockStatus(p.qty, p.min_stock).key === "green").length },
    { name: "Menipis", value: stockRows.filter((p) => stockStatus(p.qty, p.min_stock).key === "amber").length },
    { name: "Kritis", value: criticalStock.length },
  ];
  const maxQty = Math.max(...stockRows.map((p) => p.qty), 1);

  return (
    <>
      <Topbar
        title={`Selamat datang, ${user?.fullName ?? ""} 👋`}
        subtitle={format(today, "EEEE, d MMMM yyyy", { locale: localeId })}
        userInitial={user?.fullName?.[0]?.toUpperCase() ?? "U"}
      />

      {/* Total Penjualan Bulan Ini + grafik tren */}
      <div className="card bg-gradient-to-br from-orange to-orange-deep text-white border-none">
        <div className="text-[11px] uppercase tracking-wide font-bold text-[#FFE4D6] mb-2">
          Total Penjualan Bulan Ini
        </div>
        <div className="font-display text-3xl font-semibold mb-3">
          {formatRupiah(totalSalesThisMonth)}
        </div>
        <div className="bg-white/95 rounded-2xl p-2 -mx-1">
          <SalesTrendChart data={trendData} />
        </div>
      </div>

      {/* ============ KATEGORI 1: STATUS PENGIRIMAN (teal) ============ */}
      <SectionDivider label="Status Pengiriman" colorBg="#E7F1EF" colorText="#1F4A47" />
      <div className="card">
        <div className="flex items-center justify-between mb-1">
          <div className="font-display text-[15px] font-semibold">Pesanan Belum Terkirim</div>
          <span className="font-display text-lg font-semibold text-teal">{unshippedList?.length ?? 0}</span>
        </div>
        <div className="text-xs text-ink-soft mb-3">Total {formatRupiah(totalUnshipped)}</div>
        <div>
          {unshippedList?.length ? unshippedList.map((s: any, i: number) => (
            <MoneyRow key={i} label={s.customers?.name ?? "-"} sub={s.sale_number} amount={formatRupiah(Number(s.total))} />
          )) : <p className="text-xs text-ink-soft">Semua pesanan sudah terkirim. 🎉</p>}
        </div>
      </div>

      {/* ============ KATEGORI 2: STATUS PENJUALAN (oranye) ============ */}
      <SectionDivider label="Status Penjualan" colorBg="#FDEDE3" colorText="#C64A1F" />
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="font-display text-[15px] font-semibold">Invoice Belum Terbayar</div>
          <span className="font-display text-lg font-semibold text-status-red-tx">{unpaidList?.length ?? 0}</span>
        </div>
        <div className="text-xs text-ink-soft mb-3">Total {formatRupiah(totalUnpaid)}</div>
        <div>
          {unpaidList?.length ? unpaidList.map((s: any, i: number) => (
            <MoneyRow key={i} label={s.customers?.name ?? "-"} sub={s.sale_number} amount={formatRupiah(Number(s.total))} />
          )) : <p className="text-xs text-ink-soft">Semua invoice sudah terbayar. 🎉</p>}
        </div>
      </div>

      <div className="card">
        <div className="font-display text-[15px] font-semibold mb-1">Status Pembayaran Customer</div>
        <div className="text-xs text-ink-soft mb-4">Terdekat jatuh tempo ditampilkan lebih dulu</div>
        <div className="space-y-2">
          {dueList?.length ? dueList.map((s: any, i: number) => {
            const status = dueStatus(s.due_date);
            return (
              <div key={i} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-3 py-2.5 rounded-2xl border-l-4 badge-${status.key}`} style={{ borderColor: "currentColor" }}>
                <div>
                  <div className="text-[13px] font-bold">{s.customers?.name}</div>
                  <div className="text-[10.5px] opacity-70">Jatuh tempo {format(new Date(s.due_date), "d MMM yyyy")}</div>
                </div>
                <div className="font-mono text-xs font-bold whitespace-nowrap">{formatRupiah(Number(s.total))}</div>
              </div>
            );
          }) : <p className="text-sm text-ink-soft">Belum ada data penjualan yang tercatat.</p>}
        </div>
      </div>

      {/* ============ KATEGORI 3: STATUS STOK (gold) ============ */}
      <SectionDivider label="Status Stok" colorBg="#FAF1DF" colorText="#8A6A2F" />
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4 mb-4">
        <div className="card">
          <div className="font-display text-[15px] font-semibold mb-1">Ketersediaan Stok</div>
          <div className="text-xs text-ink-soft mb-4">Jumlah stok tiap produk saat ini</div>
          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
            {stockRows.length ? stockRows.map((p) => {
              const status = stockStatus(p.qty, p.min_stock);
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-28 truncate shrink-0">{p.name}</span>
                  <div className="flex-1 h-2 bg-orange-softer rounded-pill overflow-hidden">
                    <div
                      className={`h-full rounded-pill ${status.key === "red" ? "bg-status-red-bd" : status.key === "amber" ? "bg-status-amber-bd" : "bg-status-green-bd"}`}
                      style={{ width: `${Math.max(Math.min((p.qty / maxQty) * 100, 100), 3)}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-ink-soft w-20 text-right shrink-0">
                    {p.qty} {p.base_unit}
                  </span>
                </div>
              );
            }) : <p className="text-sm text-ink-soft">Belum ada produk terdaftar.</p>}
          </div>
        </div>

        <div className="card">
          <div className="font-display text-[15px] font-semibold mb-1">Distribusi Status Stok</div>
          <div className="text-xs text-ink-soft mb-4">Ringkasan kondisi seluruh produk</div>
          <StockStatusDonut data={stockDonutData} />
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-status-red-tx text-lg">⚠️</span>
          <div className="font-display text-[15px] font-semibold text-status-red-tx">Stok Kritis</div>
        </div>
        <div className="text-xs text-ink-soft mb-4">Produk di bawah atau sama dengan ambang batas minimum — segera restock</div>
        <div className="space-y-2">
          {criticalStock.length ? criticalStock.map((p) => (
            <div key={p.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-3 py-2.5 rounded-2xl bg-status-red-bg border-l-4 border-status-red-bd">
              <div className="flex items-center gap-2">
                <span className="text-status-red-tx">⚠️</span>
                <span className="text-[13px] font-bold text-status-red-tx">{p.name}</span>
              </div>
              <span className="font-mono text-xs font-bold text-status-red-tx whitespace-nowrap">
                {p.qty} {p.base_unit} <span className="opacity-60">/ min. {p.min_stock}</span>
              </span>
            </div>
          )) : <p className="text-sm text-ink-soft">Tidak ada produk dengan stok kritis saat ini. 🎉</p>}
        </div>
      </div>
    </>
  );
}
