import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import { Topbar } from "@/components/topbar";
import { StatusTransaksiTable } from "@/components/status-transaksi-table";

export default async function StatusTransaksiPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: sales } = await supabase
    .from("sales")
    .select(
      "id, sale_number, sale_date, total, status, payment_status, payment_date, payment_method, shipping_status, shipping_date, shipping_courier, customers ( name )"
    )
    .order("sale_date", { ascending: false });

  return (
    <>
      <Topbar
        title="Status Transaksi"
        subtitle="Update status pembayaran & pengiriman per transaksi"
        userInitial={user?.fullName?.[0]?.toUpperCase() ?? "U"}
      />
      <StatusTransaksiTable rows={(sales as any) ?? []} />
    </>
  );
}
