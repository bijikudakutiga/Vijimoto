import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import { Topbar } from "@/components/topbar";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

function formatRupiah(value: number) {
  return "Rp " + value.toLocaleString("id-ID");
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  // Total penjualan bulan ini
  const { data: salesThisMonth } = await supabase
    .from("sales")
    .select("total")
    .gte("sale_date", monthStart);
  const totalSalesThisMonth =
    salesThisMonth?.reduce((sum, s) => sum + Number(s.total), 0) ?? 0;

  // Piutang jatuh tempo, diurutkan terdekat, terlambat di atas
  const { data: dueList } = await supabase
    .from("sales")
    .select("sale_number, total, due_date, customers ( name )")
    .eq("payment_status", "belum_bayar")
    .order("due_date", { ascending: true })
    .limit(5);

  // Stok kritis (di bawah ambang minimum)
  const { data: products } = await supabase
    .from("products")
    .select("id, name, min_stock, product_stock ( qty_on_hand )");
  const criticalStock =
    products?.filter(
      (p: any) => (p.product_stock?.qty_on_hand ?? 0) <= p.min_stock
    ) ?? [];

  function dueStatus(dueDate: string) {
    const diffDays = Math.ceil(
      (new Date(dueDate).getTime() - today.getTime()) / 86400000
    );
    if (diffDays < 0) return { key: "red", label: "Terlambat" };
    if (diffDays <= 7) return { key: "amber", label: "Segera" };
    return { key: "green", label: "Aman" };
  }

  return (
    <>
      <Topbar
        title={`Selamat datang, ${user?.fullName ?? ""} 👋`}
        subtitle={format(today, "EEEE, d MMMM yyyy", { locale: localeId })}
        userInitial={user?.fullName?.[0]?.toUpperCase() ?? "U"}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card bg-gradient-to-br from-orange to-orange-deep text-white border-none col-span-1">
          <div className="text-[11px] uppercase tracking-wide font-bold text-[#FFE4D6] mb-2">
            Total Penjualan Bulan Ini
          </div>
          <div className="font-display text-3xl font-semibold">
            {formatRupiah(totalSalesThisMonth)}
          </div>
        </div>

        <div className="card">
          <div className="text-[11px] uppercase tracking-wide font-bold text-ink-soft mb-2">
            Stok Kritis
          </div>
          <div className="font-display text-2xl font-semibold">
            {criticalStock.length} Produk
          </div>
          <div className="text-xs text-ink-soft mt-1">perlu segera restock</div>
        </div>

        <div className="card">
          <div className="text-[11px] uppercase tracking-wide font-bold text-ink-soft mb-2">
            Invoice Belum Terbayar
          </div>
          <div className="font-display text-2xl font-semibold">
            {dueList?.length ?? 0}
          </div>
          <div className="text-xs text-ink-soft mt-1">menunggu pelunasan</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="font-display text-[17px] font-semibold mb-1">
            Status Pembayaran Customer
          </div>
          <div className="text-xs text-ink-soft mb-4">
            Terdekat jatuh tempo ditampilkan lebih dulu
          </div>
          <div className="space-y-2">
            {dueList?.length ? (
              dueList.map((s: any, i: number) => {
                const status = dueStatus(s.due_date);
                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-2xl border-l-4 badge-${status.key}`}
                    style={{ borderColor: "currentColor" }}
                  >
                    <div>
                      <div className="text-[13px] font-bold">
                        {s.customers?.name}
                      </div>
                      <div className="text-[10.5px] opacity-70">
                        Jatuh tempo {format(new Date(s.due_date), "d MMM yyyy")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xs font-bold">
                        {formatRupiah(Number(s.total))}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-ink-soft">
                Belum ada data penjualan yang tercatat.
              </p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="font-display text-[17px] font-semibold mb-1">
            Ketersediaan Stok
          </div>
          <div className="text-xs text-ink-soft mb-4">
            Produk yang berada di/bawah ambang batas minimum
          </div>
          <div className="space-y-2">
            {criticalStock.length ? (
              criticalStock.map((p: any) => (
                <div key={p.id} className="flex justify-between text-sm py-1.5 border-b border-line last:border-0">
                  <span className="font-medium">{p.name}</span>
                  <span className="font-mono text-status-red-tx text-xs">
                    {p.product_stock?.qty_on_hand ?? 0} / min. {p.min_stock}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-soft">Semua stok dalam kondisi aman.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
