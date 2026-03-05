import { isAdminAuthenticated } from "@/lib/auth";
import AdminLogin from "@/components/AdminLogin";
import AdminDashboard from "@/components/AdminDashboard";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const isAdmin = await isAdminAuthenticated();

  if (!isAdmin) {
    return <AdminLogin />;
  }

  return <AdminDashboard />;
}
