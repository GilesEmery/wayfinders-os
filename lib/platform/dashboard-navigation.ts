export type DashboardNavigationItem = { label: string; href: string };
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
  { label: "Network", items: [{ label: "Wayfinders", href: "/admin/users" }, { label: "Hubs", href: "/admin/hubs" }, { label: "Partners", href: "/admin/partners" }] },
  { label: "Work", items: [{ label: "My Tasks", href: "/admin/tasks" }, { label: "Projects", href: "/admin/projects" }, { label: "Boards", href: "/admin/boards" }, { label: "Timeline", href: "/admin/timeline" }] },
  { label: "Communication", items: [{ label: "Channels", href: "/admin/channels" }, { label: "Messages", href: "/admin/messages" }, { label: "Notifications", href: "/admin/notifications" }] },
  { label: "Experiences", items: [{ label: "Assessments", href: "/admin/assessments" }, { label: "Trainings", href: "/admin/trainings" }, { label: "Cohorts", href: "/admin/cohorts" }, { label: "Resources", href: "/admin/resources" }] },
  { label: "Engagement", items: [{ label: "Events", href: "/admin/events" }, { label: "Forms", href: "/admin/forms" }, { label: "Communications", href: "/admin/communications" }] },
  { label: "Insights", items: [{ label: "Analytics", href: "/admin/analytics" }] },
  { label: "System", items: [{ label: "Access & Billing", href: "/admin/access" }, { label: "Automations", href: "/admin/automations" }, { label: "Settings", href: "/admin/settings" }] },
];

export function buildDashboardNavigation(context: DashboardNavigationContext): DashboardNavigationGroup[] {
  const personalJourney: DashboardNavigationItem[] = [{ label: "Overview", href: "#overview" }];
  if (context.hasTrainings) personalJourney.push({ label: "Trainings", href: "#trainings" });
  if (context.hasAssessments) personalJourney.push({ label: "Assessments", href: "#assessments" });
  if (context.hasCohorts) personalJourney.push({ label: "Cohorts", href: "#community" });

  const groups: DashboardNavigationGroup[] = [{ label: "My Journey", items: personalJourney }];
  if (context.hasHubs || context.hasCohorts) groups.push({ label: "My Community", items: [{ label: "Hubs & Communities", href: "#community" }] });

  if (context.ledHubs.length) groups.push({
    label: "Hub Management",
    items: context.ledHubs.map((hub) => ({ label: context.ledHubs.length === 1 ? "Hub Overview" : hub.name, href: `/hubs/${hub.slug}` })),
  });

  if (context.adminRole) {
    groups.push(...adminGroups.map((group) => ({ ...group, items: [...group.items] })));
    if (context.adminRole === "super_admin") {
      const system = groups.find((group) => group.label === "System");
      system?.items.unshift({ label: "Administration", href: "/admin/admins" });
    }
  }
  return groups;
}
