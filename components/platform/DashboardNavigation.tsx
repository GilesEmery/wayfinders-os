"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart3, Bell, BookOpen, Building2, CalendarDays, ClipboardCheck, Columns3, CreditCard, FileBox, FileText, FolderKanban, GanttChart, LayoutDashboard, ListChecks, Mail, MessageSquare, Radio, Settings, ShieldCheck, Users, Workflow } from "lucide-react";
import { DashboardContextLink, DashboardSwitcher } from "@/components/platform/DashboardSwitcher";
import type { DashboardNavigationGroup, DashboardNavigationIcon } from "@/lib/platform/dashboard-navigation";

const icons = {
  access: CreditCard, administration: ShieldCheck, analytics: BarChart3, assessments: ClipboardCheck, automations: Workflow, boards: Columns3,
  channels: Radio, cohorts: Users, communications: Mail, events: CalendarDays, forms: FileText,
  hub: Building2, messages: MessageSquare, notifications: Bell, overview: LayoutDashboard,
  partners: Building2, projects: FolderKanban, resources: FileBox, settings: Settings,
  tasks: ListChecks, timeline: GanttChart, trainings: BookOpen, wayfinders: Users,
} satisfies Record<DashboardNavigationIcon, typeof Users>;

export function DashboardNavIcon({ icon }: { icon: DashboardNavigationIcon }) { const Icon = icons[icon]; return <Icon aria-hidden="true" size={16}/>; }

export function DashboardNavigation({ groups }: { groups: DashboardNavigationGroup[] }) {
  const [activeHash, setActiveHash] = useState("#overview");
  useEffect(() => {
    const sectionIds = groups.flatMap((group) => group.items).filter((item) => item.href.startsWith("#")).map((item) => item.href.slice(1));
    const sections = sectionIds.flatMap((id) => { const element = document.getElementById(id); return element ? [element] : []; });
    const update = () => { const current = sections.filter((section) => section.getBoundingClientRect().top <= 180).at(-1) ?? sections[0]; if (current) setActiveHash(`#${current.id}`); };
    update(); window.addEventListener("scroll", update, { passive: true }); window.addEventListener("hashchange", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("hashchange", update); };
  }, [groups]);
  return <aside className="purpose-dashboard-nav"><DashboardSwitcher/><nav aria-label="Purpose OS dashboard navigation">{groups.map((group) => <section className={group.context ? "dashboard-context-section" : undefined} key={group.label}>{group.context ? <DashboardContextLink href={group.context.href} label={group.context.label}/> : null}<h2>{group.label}</h2>{group.items.map((item) => <Link aria-current={item.href === activeHash ? "location" : undefined} className={item.href === activeHash ? "is-active" : undefined} href={item.href} key={`${group.label}-${item.href}-${item.label}`}><DashboardNavIcon icon={item.icon}/><span>{item.label}</span></Link>)}</section>)}</nav></aside>;
}
