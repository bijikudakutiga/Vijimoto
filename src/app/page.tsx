import { redirect } from "next/navigation";

// Alamat utama ("/") selalu diarahkan ke dashboard.
// Kalau belum login, middleware akan otomatis mengarahkan ke /login duluan.
export default function RootPage() {
  redirect("/dashboard");
}
