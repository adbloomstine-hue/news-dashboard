import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { Toaster } from "@/components/ui/toaster";

export const metadata = {
  title: { template: "%s | Admin", default: "Admin" },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-bg-base">
      <AdminNav />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
