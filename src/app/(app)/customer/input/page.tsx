import { getCurrentUser } from "@/lib/permissions";
import { Topbar } from "@/components/topbar";
import { CustomerInputForm } from "@/components/customer-input-form";

export default async function InputCustomerPage() {
  const user = await getCurrentUser();
  return (
    <>
      <Topbar
        title="Input Data Customer"
        subtitle="Tambahkan customer baru ke sistem"
        userInitial={user?.fullName?.[0]?.toUpperCase() ?? "U"}
      />
      <CustomerInputForm />
    </>
  );
}
