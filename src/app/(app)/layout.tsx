import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { InstallPrompt } from "@/components/install-prompt";
import { getCurrentUser } from "@/lib/permissions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 px-10 py-8 overflow-x-hidden">{children}</main>
      <InstallPrompt />
    </div>
  );
}
