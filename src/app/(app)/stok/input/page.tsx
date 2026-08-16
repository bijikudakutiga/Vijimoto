import { getCurrentUser } from "@/lib/permissions";
import { Topbar } from "@/components/topbar";
import { ProductInputForm } from "@/components/product-input-form";

export default async function InputStokPage() {
  const user = await getCurrentUser();
  return (
    <>
      <Topbar
        title="Input Stok"
        subtitle="Tambah produk baru beserta satuan konversi dan stok awal"
        userInitial={user?.fullName?.[0]?.toUpperCase() ?? "U"}
      />
      <ProductInputForm />
    </>
  );
}
