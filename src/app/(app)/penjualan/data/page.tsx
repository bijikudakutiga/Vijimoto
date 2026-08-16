import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import { Topbar } from "@/components/topbar";
import { DataPenjualanTable } from "@/components/data-penjualan-table";

export default async function DataPenjualanPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: sales } = await supabase
    .from("sales")
    .select(
      "id, sale_number, sale_date, subtotal, discount_amount, tax_amount, total, status, payment_status, shipping_status, is_locked, customers ( name )"
    )
    .order("sale_date", { ascending: false });

  return (
    <>
      <Topbar
        title="Data Penjualan"
        subtitle="Rekap seluruh transaksi — bisa difilter, disortir, dan diexport"
        userInitial={user?.fullName?.[0]?.toUpperCase() ?? "U"}
      />
      <DataPenjualanTable rows={(sales as any) ?? []} />
    </>
  );
}
