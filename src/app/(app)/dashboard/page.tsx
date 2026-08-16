import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import { Topbar } from "@/components/topbar";
import { SalesTrendChart, StockStatusDonut } from "@/components/dashboard-charts";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

function formatRupiah(value: number) {
  return "Rp " + value.toLocaleString("id-ID");
}
function stockStatus(qty: number, min: number) {
  if (qty <= min) return { key: "red", label: "Kritis" };
  if (qty <= min * 1.5) return { key: "amber", label: "Menipis" };
  return { key: "green", label: "Aman" };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const today = new Date();
  const monthStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthStart = monthStartDate.toISOString().slice(0, 10);

  // Total penjualan bulan ini + tren harian untuk grafik
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

  // Status Penjualan: invoice belum terbayar & pengiriman belum terkirim
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

  // Status pembayaran customer (piutang jatuh tempo)
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

  // Stok: seluruh produk + kritis
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

      {/* 1. Total Penjualan Bulan Ini + grafik tren */}
      <div className="card bg-gradient-to-br from-orange to-orange-deep text-white border-none mb-4">
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

      {/* 2. Status Penjualan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <div className="font-display text-[15px] font-semibold">Invoice Belum Terbayar</div>
            <span className="font-display text-lg font-semibold text-status-red-tx">{unpaidList?.length ?? 0}</span>
          </div>
          <div className="text-xs text-ink-soft mb-3">Total {formatRupiah(totalUnpaid)}</div>
          <div className="space-y-1.5">
            {unpaidList?.length ? unpaidList.map((s: any, i: number) => (
              <div key={i} className="flex justify-between text-xs py-1 border-b border-line last:border-0">
                <span className="text-ink-soft">{s.customers?.name} · <span className="font-mono">{s.sale_number}</span></span>
                <span className="font-mono font-semibold">{formatRupiah(Number(s.total))}</span>
              </div>
            )) : <p className="text-xs text-ink-soft">Semua invoice sudah terbayar.</p>}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <div className="font-display text-[15px] font-semibold">Belum Terkirim</div>
            <span className="font-display text-lg font-semibold text-status-amber-tx">{unshippedList?.length ?? 0}</span>
          </div>
          <div className="text-xs text-ink-soft mb-3">Total {formatRupiah(totalUnshipped)}</div>
          <div className="space-y-1.5">
            {unshippedList?.length ? unshippedList.map((s: any, i: number) => (
              <div key={i} className="flex justify-between text-xs py-1 border-b border-line last:border-0">
                <span className="text-ink-soft">{s.customers?.name} · <span className="font-mono">{s.sale_number}</span></span>
                <span className="font-mono font-semibold">{formatRupiah(Number(s.total))}</span>
              </div>
            )) : <p className="text-xs text-ink-soft">Semua pesanan sudah terkirim.</p>}
          </div>
        </div>
      </div>

      {/* 3. Status Pembayaran Customer */}
      <div className="card mb-4">
        <div className="font-display text-[15px] font-semibold mb-1">Status Pembayaran Customer</div>
        <div className="text-xs text-ink-soft mb-4">Terdekat jatuh tempo ditampilkan lebih dulu</div>
        <div className="space-y-2">
          {dueList?.length ? dueList.map((s: any, i: number) => {
            const status = dueStatus(s.due_date);
            return (
              <div key={i} className={`flex items-center justify-between px-3 py-2.5 rounded-2xl border-l-4 badge-${status.key}`} style={{ borderColor: "currentColor" }}>
                <div>
                  <div className="text-[13px] font-bold">{s.customers?.name}</div>
                  <div className="text-[10.5px] opacity-70">Jatuh tempo {format(new Date(s.due_date), "d MMM yyyy")}</div>
                </div>
                <div className="font-mono text-xs font-bold">{formatRupiah(Number(s.total))}</div>
              </div>
            );
          }) : <p className="text-sm text-ink-soft">Belum ada data penjualan yang tercatat.</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4 mb-4">
        {/* 4. Ketersediaan Stok (detail per produk) */}
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

        {/* Distribusi status stok (donut) */}
        <div className="card">
          <div className="font-display text-[15px] font-semibold mb-1">Distribusi Status Stok</div>
          <div className="text-xs text-ink-soft mb-4">Ringkasan kondisi seluruh produk</div>
          <StockStatusDonut data={stockDonutData} />
        </div>
      </div>

      {/* 5. Stok Kritis (detail, merah, warning) */}
      <div className="card border-status-red-bd/40">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-status-red-tx text-lg">⚠️</span>
          <div className="font-display text-[15px] font-semibold text-status-red-tx">Stok Kritis</div>
        </div>
        <div className="text-xs text-ink-soft mb-4">Produk di bawah atau sama dengan ambang batas minimum — segera restock</div>
        <div className="space-y-2">
          {criticalStock.length ? criticalStock.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-3 py-2.5 rounded-2xl bg-status-red-bg border-l-4 border-status-red-bd">
              <div className="flex items-center gap-2">
                <span className="text-status-red-tx">⚠️</span>
                <span className="text-[13px] font-bold text-status-red-tx">{p.name}</span>
              </div>
              <span className="font-mono text-xs font-bold text-status-red-tx">
                {p.qty} {p.base_unit} <span className="opacity-60">/ min. {p.min_stock}</span>
              </span>
            </div>
          )) : <p className="text-sm text-ink-soft">Tidak ada produk dengan stok kritis saat ini. 🎉</p>}
        </div>
      </div>
    </>
  );
}
