import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import { Topbar } from "@/components/topbar";
import { CustomerRiwayat } from "@/components/customer-riwayat";

export default async function RiwayatCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  const { customer: customerId } = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, pic_name, payment_track")
    .order("name");

  let sales: any[] = [];
  let selectedCustomer: any = null;

  if (customerId) {
    selectedCustomer = customers?.find((c) => c.id === customerId) ?? null;
    const { data } = await supabase
      .from("sales")
      .select(
        "id, sale_number, sale_date, total, status, payment_status, payment_date, shipping_status, shipping_date, due_date"
      )
      .eq("customer_id", customerId)
      .order("sale_date", { ascending: false });
    sales = data ?? [];
  }

  return (
    <>
      <Topbar
        title="Riwayat Customer"
        subtitle="Lihat seluruh riwayat transaksi per customer"
        userInitial={user?.fullName?.[0]?.toUpperCase() ?? "U"}
      />
      <CustomerRiwayat
        customers={customers ?? []}
        selectedCustomerId={customerId ?? ""}
        selectedCustomer={selectedCustomer}
        sales={sales}
      />
    </>
  );
}
