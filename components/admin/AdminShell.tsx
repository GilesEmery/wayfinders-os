"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Gauge } from "lucide-react";
import { AdminBuildBlueprint } from "@/components/admin/AdminBuildBlueprint";
import { DashboardNavIcon } from "@/components/platform/DashboardNavigation";
import { DashboardContextLink, DashboardSwitcher } from "@/components/platform/DashboardSwitcher";
import { PURPOSE_OS_SIDEBAR_SCROLL_KEY, useSidebarScrollPersistence } from "@/components/platform/useSidebarScrollPersistence";
import { PlatformHeader } from "@/components/platform/PlatformHeader";
import type { AdminIdentity } from "@/lib/admin/auth";
import { blueprintForPath } from "@/lib/admin/build-blueprints";
import { buildOperationalNavigation } from "@/lib/platform/dashboard-navigation";

function activeNavigationHref(pathname: string, hrefs: string[]) { return hrefs.filter((href) => pathname === href || pathname.startsWith(`${href}/`)).sort((a, b) => b.length - a.length)[0]; }

export function AdminShell({ admin, children, showAutomaticBlueprint = true, focused = false }: { admin: AdminIdentity; children: ReactNode; showAutomaticBlueprint?: boolean; focused?: boolean }) {
  const pathname = usePathname();
  const { sidebarRef, rememberScroll } = useSidebarScrollPersistence(PURPOSE_OS_SIDEBAR_SCROLL_KEY);
  const groups = buildOperationalNavigation(admin.role);
  const activeHref = activeNavigationHref(pathname, groups.flatMap((group) => group.items.map((item) => item.href)));
  const developmentBlueprint = showAutomaticBlueprint && process.env.NODE_ENV === "development" ? blueprintForPath(pathname) : undefined;
  return <div className={`admin-platform-shell${focused ? " is-focused-builder" : ""}`}><PlatformHeader/><div className="admin-shell">{!focused && <aside className="admin-sidebar" onScroll={rememberScroll} ref={sidebarRef}><DashboardSwitcher/><DashboardContextLink active href="/admin" label="Admin Dashboard"/><nav aria-label="Purpose OS administration">{groups.map((group, index) => <div className="admin-nav-group" key={group.label ?? index}>{group.label && <p>{group.label}</p>}{group.items.map(({ label, href, icon }) => <Link aria-current={href === activeHref ? "page" : undefined} className={href === activeHref ? "is-active" : undefined} href={href} key={href}><DashboardNavIcon icon={icon}/><span>{label}</span></Link>)}</div>)}</nav><div className="admin-sidebar-foot"><Gauge aria-hidden="true" size={16}/><span>{admin.role === "super_admin" ? "Super Admin" : "Admin"} operations</span></div></aside>}<div className="admin-workspace"><main className="admin-content">{children}{developmentBlueprint && <AdminBuildBlueprint blueprint={developmentBlueprint}/>}</main></div></div></div>;
}

export function AdminPageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) { return <div className="admin-page-heading"><div><p className="admin-kicker">{eyebrow}</p><h1>{title}</h1>{description && <p className="admin-lede">{description}</p>}</div>{action && <div className="admin-page-action">{action}</div>}</div>; }
export function AdminEmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <section className="admin-empty-state"><span>ARCHITECTURE READY</span><h2>{title}</h2><p>{description}</p>{action}</section>; }
export function LMUAdminBadge() { return <span className="admin-lmu-badge"><Image src="/brand/lmu/lmu-u-mark-white.png" alt="Life Mapping U" width={44} height={44}/></span>; }
