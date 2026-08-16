import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import { Topbar } from "@/components/topbar";
import { KasTable } from "@/components/kas-table";

export default async function KasPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: transactions } = await supabase
    .from("cash_transactions")
    .select("id, type, category, amount, description, transaction_date")
    .order("transaction_date", { ascending: false });

  return (
    <>
      <Topbar
        title="Kas"
        subtitle="Kas masuk dan kas keluar"
        userInitial={user?.fullName?.[0]?.toUpperCase() ?? "U"}
      />
      <KasTable rows={transactions ?? []} />
    </>
  );
}
