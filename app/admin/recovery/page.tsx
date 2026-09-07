import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPasswordForm } from "@/components/admin/AdminPasswordForm";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <main className="admin-auth-page"><section className="admin-auth-panel"><p className="admin-kicker">Local Alpha Recovery</p><h1>Recover super admin</h1><p className="admin-auth-intro">Development-only recovery for the initial Purpose OS super administrator.</p><AdminPasswordForm mode="recovery" /><nav className="admin-auth-links"><Link href="/admin/login">Return to sign in</Link></nav></section></main>;
}
