import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import { Topbar } from "@/components/topbar";
import { SalesEditForm } from "@/components/sales-edit-form";

export default async function EditPenjualanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: sale } = await supabase
    .from("sales")
    .select(
      "id, sale_number, customer_id, sale_date, discount_amount, tax_enabled, tax_percent, payment_term_days, is_locked"
    )
    .eq("id", id)
    .single();

  if (!sale) redirect("/penjualan/data");
  if (sale.is_locked) redirect("/penjualan/data");

  const { data: saleItems } = await supabase
    .from("sale_items")
    .select("id, product_id, unit_name, qty, unit_price, is_manual_price, discount_amount")
    .eq("sale_id", id);

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, pic_name")
    .order("name");

  const { data: products } = await supabase
    .from("products")
    .select(
      "id, name, sku, price_sell, base_unit, product_units ( unit_name, conversion_to_base, is_base_unit )"
    )
    .eq("is_active", true)
    .order("name");

  return (
    <>
      <Topbar
        title={`Edit Transaksi — ${sale.sale_number}`}
        subtitle="Perubahan item akan menyesuaikan stok secara otomatis"
        userInitial={user?.fullName?.[0]?.toUpperCase() ?? "U"}
      />
      <SalesEditForm
        sale={sale}
        initialItems={saleItems ?? []}
        customers={customers ?? []}
        products={products ?? []}
      />
    </>
  );
}
