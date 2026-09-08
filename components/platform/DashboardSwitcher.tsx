"use client";

import { ClipboardCheck, LayoutDashboard, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashboardSwitcher() {
  const pathname = usePathname();
  return <><nav className="dashboard-switcher" aria-label="Dashboard view">
    <Link className={pathname === "/dashboard" ? "is-active" : undefined} href="/dashboard"><UserRound aria-hidden="true" size={17}/><span>My Dashboard</span></Link>
  </nav>{pathname.startsWith("/admin") ? <PersistentPersonalNavigation/> : null}</>;
}

export function PersistentPersonalNavigation() {
  return <nav className="persistent-personal-nav" aria-label="My Dashboard sections"><p>My Journey</p><Link href="/dashboard#overview"><LayoutDashboard aria-hidden="true" size={16}/><span>Overview</span></Link><Link href="/dashboard#assessments"><ClipboardCheck aria-hidden="true" size={16}/><span>Assessments</span></Link></nav>;
}

export function DashboardContextLink({ label, href, active = false }: { label: string; href: string; active?: boolean }) {
  const pathname = usePathname(); const selected = active || pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
  return <Link aria-current={selected ? "page" : undefined} className={`dashboard-context-link${selected ? " is-active" : ""}`} href={href}><LayoutDashboard aria-hidden="true" size={17}/><span>{label}</span></Link>;
}
