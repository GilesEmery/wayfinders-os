import Link from "next/link";
import { BarChart3, Bell, BookOpen, Building2, CalendarDays, ClipboardCheck, Columns3, CreditCard, FileBox, FileText, FolderKanban, GanttChart, LayoutDashboard, ListChecks, Mail, MessageSquare, Radio, Settings, ShieldCheck, Users, Workflow } from "lucide-react";
import { DashboardSwitcher } from "@/components/platform/DashboardSwitcher";
import type { DashboardNavigationGroup, DashboardNavigationIcon } from "@/lib/platform/dashboard-navigation";

const icons = {
  access: CreditCard, administration: ShieldCheck, analytics: BarChart3, assessments: ClipboardCheck, automations: Workflow, boards: Columns3,
  channels: Radio, cohorts: Users, communications: Mail, events: CalendarDays, forms: FileText,
  hub: Building2, messages: MessageSquare, notifications: Bell, overview: LayoutDashboard,
  partners: Building2, projects: FolderKanban, resources: FileBox, settings: Settings,
  tasks: ListChecks, timeline: GanttChart, trainings: BookOpen, wayfinders: Users,
} satisfies Record<DashboardNavigationIcon, typeof Users>;

export function DashboardNavigation({ groups, showAdminDashboard }: { groups: DashboardNavigationGroup[]; showAdminDashboard: boolean }) {
  return <aside className="purpose-dashboard-nav"><DashboardSwitcher active="personal" showAdmin={showAdminDashboard}/><nav aria-label="Purpose OS dashboard navigation">{groups.map((group) => <section key={group.label}><h2>{group.label}</h2>{group.items.map((item) => { const Icon = icons[item.icon]; return <Link href={item.href} key={`${group.label}-${item.href}-${item.label}`}><Icon aria-hidden="true" size={16}/><span>{item.label}</span></Link>; })}</section>)}</nav></aside>;
}
