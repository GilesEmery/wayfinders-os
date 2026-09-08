"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BarChart3, Bell, BookOpen, Building2, CalendarDays, ClipboardCheck, Columns3, CreditCard, FileBox, FileText, FolderKanban, Gauge, GanttChart, ListChecks, Mail, MessageSquare, Radio, Settings, ShieldCheck, Users, Workflow } from "lucide-react";
import { AdminBuildBlueprint } from "@/components/admin/AdminBuildBlueprint";
import { DashboardSwitcher } from "@/components/platform/DashboardSwitcher";
import { PlatformHeader } from "@/components/platform/PlatformHeader";
import type { AdminIdentity } from "@/lib/admin/auth";
import { blueprintForPath } from "@/lib/admin/build-blueprints";

const groups = [
  { label: "Wayfinders", items: [{ label: "Wayfinders", href: "/admin/users", icon: Users }] },
  { label: "Communities", items: [{ label: "Hubs", href: "/admin/hubs", icon: Building2 }, { label: "Partners", href: "/admin/partners", icon: Building2 }] },
  { label: "Work", items: [{ label: "My Tasks", href: "/admin/tasks", icon: ListChecks }, { label: "Projects", href: "/admin/projects", icon: FolderKanban }, { label: "Boards", href: "/admin/boards", icon: Columns3 }, { label: "Timeline", href: "/admin/timeline", icon: GanttChart }] },
  { label: "Communication", items: [{ label: "Channels", href: "/admin/channels", icon: Radio }, { label: "Messages", href: "/admin/messages", icon: MessageSquare }, { label: "Notifications", href: "/admin/notifications", icon: Bell }] },
  { label: "Experiences", items: [{ label: "Assessments", href: "/admin/assessments", icon: ClipboardCheck }, { label: "Trainings", href: "/admin/trainings", icon: BookOpen }, { label: "Cohorts", href: "/admin/cohorts", icon: Users }, { label: "Resources", href: "/admin/resources", icon: FileBox }] },
  { label: "Engagement", items: [{ label: "Events", href: "/admin/events", icon: CalendarDays }, { label: "Forms", href: "/admin/forms", icon: FileText }, { label: "Communications", href: "/admin/communications", icon: Mail }] },
  { label: "Insights", items: [{ label: "Analytics", href: "/admin/analytics", icon: BarChart3 }] },
  { label: "System", items: [{ label: "Administration", href: "/admin/admins", icon: ShieldCheck }, { label: "Access & Billing", href: "/admin/access", icon: CreditCard }, { label: "Automations", href: "/admin/automations", icon: Workflow }, { label: "Settings", href: "/admin/settings", icon: Settings }] },
];

function isActive(pathname: string, href: string) { return href === "/admin" ? pathname === href : pathname.startsWith(href); }

export function AdminShell({ admin, children, showAutomaticBlueprint = true }: { admin: AdminIdentity; children: ReactNode; showAutomaticBlueprint?: boolean }) {
  const pathname = usePathname();
  const developmentBlueprint = showAutomaticBlueprint && process.env.NODE_ENV === "development" ? blueprintForPath(pathname) : undefined;
  return <div className="admin-platform-shell"><PlatformHeader/><div className="admin-shell"><aside className="admin-sidebar"><DashboardSwitcher active="admin" showAdmin/><nav aria-label="Purpose OS administration">{groups.map((group, index) => <div className="admin-nav-group" key={group.label ?? index}>{group.label && <p>{group.label}</p>}{group.items.map(({ label, href, icon: Icon }) => <Link className={isActive(pathname, href) ? "is-active" : undefined} href={href} key={href}><Icon aria-hidden="true" size={16}/><span>{label}</span></Link>)}</div>)}</nav><div className="admin-sidebar-foot"><Gauge aria-hidden="true" size={16}/><span>{admin.role === "super_admin" ? "Super Admin" : "Admin"} operations</span></div></aside><div className="admin-workspace"><main className="admin-content">{children}{developmentBlueprint && <AdminBuildBlueprint blueprint={developmentBlueprint}/>}</main></div></div></div>;
}

export function AdminPageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) { return <div className="admin-page-heading"><div><p className="admin-kicker">{eyebrow}</p><h1>{title}</h1>{description && <p className="admin-lede">{description}</p>}</div>{action && <div className="admin-page-action">{action}</div>}</div>; }
export function AdminEmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <section className="admin-empty-state"><span>ARCHITECTURE READY</span><h2>{title}</h2><p>{description}</p>{action}</section>; }
export function LMUAdminBadge() { return <span className="admin-lmu-badge"><Image src="/brand/lmu/lmu-u-mark-white.png" alt="Life Mapping U" width={44} height={44}/></span>; }
