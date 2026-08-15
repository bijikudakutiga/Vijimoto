import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import { Topbar } from "@/components/topbar";
import { StockOpnameForm } from "@/components/stock-opname-form";

export default async function StokOpnamePage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: products } = await supabase
    .from("products")
    .select("id, name, base_unit, product_stock ( qty_on_hand )")
    .eq("is_active", true)
    .order("name");

  const rows = (products ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    base_unit: p.base_unit,
    system_qty: p.product_stock?.qty_on_hand ?? 0,
  }));

  const { data: history } = await supabase
    .from("stock_opname")
    .select("id, opname_date, status, notes")
    .order("opname_date", { ascending: false })
    .limit(10);

  return (
    <>
      <Topbar
        title="Stok Opname"
        subtitle="Cocokkan stok sistem dengan hasil hitung fisik"
        userInitial={user?.fullName?.[0]?.toUpperCase() ?? "U"}
      />
      <StockOpnameForm products={rows} history={history ?? []} />
    </>
  );
}
