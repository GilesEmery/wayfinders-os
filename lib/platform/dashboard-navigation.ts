export type DashboardNavigationIcon = "access" | "administration" | "analytics" | "assessments" | "automations" | "boards" | "channels" | "cohorts" | "communications" | "events" | "forms" | "hub" | "messages" | "notifications" | "overview" | "partners" | "projects" | "resources" | "settings" | "tasks" | "timeline" | "trainings" | "wayfinders";
export type DashboardNavigationItem = { label: string; href: string; icon: DashboardNavigationIcon };
export type DashboardNavigationGroup = { label: string; items: DashboardNavigationItem[] };

type DashboardNavigationContext = {
  hasAssessments: boolean;
  hasTrainings: boolean;
  hasCohorts: boolean;
  hasHubs: boolean;
  adminRole: "admin" | "super_admin" | null;
  ledHubs: Array<{ id: string; name: string; slug: string }>;
};

const adminGroups: DashboardNavigationGroup[] = [
  { label: "Wayfinders", items: [{ label: "Wayfinders", href: "/admin/users", icon: "wayfinders" }] },
  { label: "Communities", items: [{ label: "Hubs", href: "/admin/hubs", icon: "hub" }, { label: "Partners", href: "/admin/partners", icon: "partners" }] },
  { label: "Work", items: [{ label: "My Tasks", href: "/admin/tasks", icon: "tasks" }, { label: "Projects", href: "/admin/projects", icon: "projects" }, { label: "Boards", href: "/admin/boards", icon: "boards" }, { label: "Timeline", href: "/admin/timeline", icon: "timeline" }] },
  { label: "Communication", items: [{ label: "Channels", href: "/admin/channels", icon: "channels" }, { label: "Messages", href: "/admin/messages", icon: "messages" }, { label: "Notifications", href: "/admin/notifications", icon: "notifications" }] },
  { label: "Experiences", items: [{ label: "Assessments", href: "/admin/assessments", icon: "assessments" }, { label: "Trainings", href: "/admin/trainings", icon: "trainings" }, { label: "Cohorts", href: "/admin/cohorts", icon: "cohorts" }, { label: "Resources", href: "/admin/resources", icon: "resources" }] },
  { label: "Engagement", items: [{ label: "Events", href: "/admin/events", icon: "events" }, { label: "Forms", href: "/admin/forms", icon: "forms" }, { label: "Communications", href: "/admin/communications", icon: "communications" }] },
  { label: "Insights", items: [{ label: "Analytics", href: "/admin/analytics", icon: "analytics" }] },
  { label: "System", items: [{ label: "Access & Billing", href: "/admin/access", icon: "access" }, { label: "Automations", href: "/admin/automations", icon: "automations" }, { label: "Settings", href: "/admin/settings", icon: "settings" }] },
];

export function buildDashboardNavigation(context: DashboardNavigationContext): DashboardNavigationGroup[] {
  const personalJourney: DashboardNavigationItem[] = [{ label: "Overview", href: "#overview", icon: "overview" }];
  if (context.hasTrainings) personalJourney.push({ label: "Trainings", href: "#trainings", icon: "trainings" });
  if (context.hasAssessments) personalJourney.push({ label: "Assessments", href: "#assessments", icon: "assessments" });
  if (context.hasCohorts) personalJourney.push({ label: "Cohorts", href: "#community", icon: "cohorts" });

  const groups: DashboardNavigationGroup[] = [{ label: "My Journey", items: personalJourney }];
  if (context.hasHubs || context.hasCohorts) groups.push({ label: "My Community", items: [{ label: "Hubs & Communities", href: "#community", icon: "hub" }] });

  if (context.ledHubs.length) groups.push({
    label: "Hub Management",
    items: context.ledHubs.map((hub) => ({ label: context.ledHubs.length === 1 ? "Hub Overview" : hub.name, href: `/hubs/${hub.slug}`, icon: "hub" })),
  });

  if (context.adminRole) {
    groups.push(...adminGroups.map((group) => ({ ...group, items: [...group.items] })));
    if (context.adminRole === "super_admin") {
      const system = groups.find((group) => group.label === "System");
      system?.items.unshift({ label: "Administration", href: "/admin/admins", icon: "administration" });
    }
  }
  return groups;
}
