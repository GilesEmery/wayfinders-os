import { AdminPasswordForm } from "@/components/admin/AdminPasswordForm";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/auth";

export default async function Page() {
  const admin = await requireAdmin();
  return <AdminShell admin={admin}>
    <p className="admin-kicker">Account Security</p><h1>Change password</h1>
    <p className="admin-lede">Confirm your current password before choosing a new password for your Purpose OS admin account.</p>
    <section className="admin-account-panel"><AdminPasswordForm /></section>
  </AdminShell>;
}
