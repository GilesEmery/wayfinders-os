"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BarChart3, Bell, BookOpen, Building2, CalendarDays, ClipboardCheck, CreditCard, FileBox, Gauge, LayoutDashboard, Mail, MessageSquare, Settings, ShieldCheck, Users, Workflow } from "lucide-react";
import type { AdminIdentity } from "@/lib/admin/auth";

const groups = [
  { label: null, items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }] },
  { label: "Wayfinders", items: [{ label: "Wayfinders", href: "/admin/users", icon: Users }, { label: "Organizations & Hubs", href: "/admin/organizations", icon: Building2 }] },
  { label: "Experiences", items: [{ label: "Assessments", href: "/admin/assessments", icon: ClipboardCheck }, { label: "Trainings", href: "/admin/trainings", icon: BookOpen }, { label: "Resources", href: "/admin/resources", icon: FileBox }] },
  { label: "Engagement", items: [{ label: "Events", href: "/admin/events", icon: CalendarDays }, { label: "Communications", href: "/admin/communications", icon: Mail }, { label: "Messages", href: "/admin/messages", icon: MessageSquare }, { label: "Notifications", href: "/admin/notifications", icon: Bell }] },
  { label: "Insights", items: [{ label: "Analytics", href: "/admin/analytics", icon: BarChart3 }] },
  { label: "System", items: [{ label: "Administration", href: "/admin/admins", icon: ShieldCheck }, { label: "Access & Billing", href: "/admin/access", icon: CreditCard }, { label: "Automations", href: "/admin/automations", icon: Workflow }, { label: "Settings", href: "/admin/settings", icon: Settings }] },
];

function isActive(pathname: string, href: string) { return href === "/admin" ? pathname === href : pathname.startsWith(href); }

export function AdminShell({ admin, children }: { admin: AdminIdentity; children: ReactNode }) {
  const pathname = usePathname();
  return <div className="admin-shell"><aside className="admin-sidebar"><Link className="admin-wordmark" href="/admin"><span>Purpose OS</span><small>by Wayfinders</small></Link><nav aria-label="Purpose OS administration">{groups.map((group, index) => <div className="admin-nav-group" key={group.label ?? index}>{group.label && <p>{group.label}</p>}{group.items.map(({ label, href, icon: Icon }) => <Link className={isActive(pathname, href) ? "is-active" : undefined} href={href} key={href}><Icon aria-hidden="true" size={16}/><span>{label}</span></Link>)}</div>)}</nav><div className="admin-sidebar-foot"><Gauge aria-hidden="true" size={16}/><span>Purpose OS operations</span></div></aside><div className="admin-workspace"><header className="admin-header"><strong>PURPOSE OS <span>ADMIN</span></strong><div className="admin-identity"><span><b>{admin.displayName ?? admin.email}</b><small>{admin.role === "super_admin" ? "Super Admin" : "Admin"}</small></span><Link href="/account">ACCOUNT</Link><form action="/api/account/logout" method="post"><button>LOG OUT</button></form></div></header><main className="admin-content">{children}</main></div></div>;
}

export function AdminPageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) { return <div className="admin-page-heading"><div><p className="admin-kicker">{eyebrow}</p><h1>{title}</h1>{description && <p className="admin-lede">{description}</p>}</div>{action && <div className="admin-page-action">{action}</div>}</div>; }
export function AdminEmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <section className="admin-empty-state"><span>ARCHITECTURE READY</span><h2>{title}</h2><p>{description}</p>{action}</section>; }
export function LMUAdminBadge() { return <span className="admin-lmu-badge"><Image src="/brand/lmu/lmu-u-mark-white.png" alt="Life Mapping U" width={44} height={44}/></span>; }
