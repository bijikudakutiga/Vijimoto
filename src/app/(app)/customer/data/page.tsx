import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import { Topbar } from "@/components/topbar";
import { CustomerTable } from "@/components/customer-table";

export default async function DataCustomerPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: customers } = await supabase
    .from("customers")
    .select(
      "id, name, pic_name, address, phone, email, payment_track, updated_at"
    )
    .order("name");

  // Ambil tanggal order terakhir & jatuh tempo terdekat per customer
  const { data: sales } = await supabase
    .from("sales")
    .select("customer_id, sale_date, due_date, payment_status, total")
    .order("sale_date", { ascending: false });

  const customerStats = new Map<
    string,
    { lastOrder: string | null; nextDue: string | null; totalPurchase: number }
  >();

  for (const s of sales ?? []) {
    const stat = customerStats.get(s.customer_id) ?? {
      lastOrder: null,
      nextDue: null,
      totalPurchase: 0,
    };
    if (!stat.lastOrder || s.sale_date > stat.lastOrder) stat.lastOrder = s.sale_date;
    if (
      s.payment_status === "belum_bayar" &&
      (!stat.nextDue || s.due_date < stat.nextDue)
    ) {
      stat.nextDue = s.due_date;
    }
    stat.totalPurchase += Number(s.total);
    customerStats.set(s.customer_id, stat);
  }

  const rows = (customers ?? []).map((c) => ({
    ...c,
    stats: customerStats.get(c.id) ?? {
      lastOrder: null,
      nextDue: null,
      totalPurchase: 0,
    },
  }));

  return (
    <>
      <Topbar
        title="Data Customer"
        subtitle={`${rows.length} customer terdaftar`}
        userInitial={user?.fullName?.[0]?.toUpperCase() ?? "U"}
      />
      <CustomerTable rows={rows} />
    </>
  );
}
