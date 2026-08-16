import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import { Topbar } from "@/components/topbar";
import { StockDataTable } from "@/components/stock-data-table";

export default async function DataStokPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: products } = await supabase
    .from("products")
    .select(
      "id, name, sku, base_unit, price_sell, price_buy, min_stock, is_active, product_stock ( qty_on_hand )"
    )
    .order("name");

  const rows = (products ?? []).map((p: any) => ({
    ...p,
    qty_on_hand: p.product_stock?.qty_on_hand ?? 0,
  }));

  return (
    <>
      <Topbar
        title="Data Stok"
        subtitle={`${rows.length} produk terdaftar`}
        userInitial={user?.fullName?.[0]?.toUpperCase() ?? "U"}
      />
      <StockDataTable rows={rows} />
    </>
  );
}
