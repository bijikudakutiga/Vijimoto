import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import { Topbar } from "@/components/topbar";
import { ReturForm } from "@/components/retur-form";

export default async function ReturBarangPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  // Hanya transaksi yang sudah tercatat (bukan draft) yang bisa diretur
  const { data: sales } = await supabase
    .from("sales")
    .select("id, sale_number, sale_date, customers ( name )")
    .neq("status", "draft")
    .order("sale_date", { ascending: false })
    .limit(200);

  const { data: returns } = await supabase
    .from("returns")
    .select("id, return_number, return_date, reason, total_amount, refund_to_cash, sales ( sale_number, customers ( name ) )")
    .order("return_date", { ascending: false })
    .limit(50);

  return (
    <>
      <Topbar
        title="Retur Barang"
        subtitle="Catat pengembalian barang dari customer — stok otomatis bertambah kembali"
        userInitial={user?.fullName?.[0]?.toUpperCase() ?? "U"}
      />
      <ReturForm sales={(sales as any) ?? []} returns={(returns as any) ?? []} />
    </>
  );
}
