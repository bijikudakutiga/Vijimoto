import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import { Topbar } from "@/components/topbar";
import { SalesInputForm } from "@/components/sales-input-form";

export default async function InputPenjualanPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, pic_name")
    .order("name");

  const { data: products } = await supabase
    .from("products")
    .select("id, name, sku, price_sell, base_unit, product_units ( unit_name, conversion_to_base, is_base_unit )")
    .eq("is_active", true)
    .order("name");

  return (
    <>
      <Topbar
        title="Input Penjualan"
        subtitle="Buat transaksi penjualan baru — status otomatis \"terproses\" setelah disimpan"
        userInitial={user?.fullName?.[0]?.toUpperCase() ?? "U"}
      />
      <SalesInputForm
        customers={customers ?? []}
        products={products ?? []}
      />
    </>
  );
}
