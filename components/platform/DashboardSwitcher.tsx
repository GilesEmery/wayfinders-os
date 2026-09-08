import { LayoutDashboard } from "lucide-react";
import Link from "next/link";

export function DashboardSwitcher({ active, showAdmin }: { active: "personal" | "admin"; showAdmin: boolean }) {
  return <nav className="dashboard-switcher" aria-label="Dashboard view">
    <Link className={active === "personal" ? "is-active" : undefined} href="/dashboard"><LayoutDashboard aria-hidden="true" size={17}/><span>My Dashboard</span></Link>
    {showAdmin && <Link className={active === "admin" ? "is-active" : undefined} href="/admin"><LayoutDashboard aria-hidden="true" size={17}/><span>Admin Dashboard</span></Link>}
  </nav>;
}
