export type DashboardNavigationIcon = "access" | "administration" | "analytics" | "assessments" | "automations" | "boards" | "channels" | "cohorts" | "communications" | "events" | "forms" | "hub" | "messages" | "notifications" | "overview" | "partners" | "projects" | "resources" | "settings" | "tasks" | "timeline" | "trainings" | "wayfinders";
export type DashboardNavigationItem = { label: string; href: string; icon: DashboardNavigationIcon; requiresEntitlement?: string };
export type DashboardNavigationGroup = { label: string; items: DashboardNavigationItem[]; context?: { label: string; href: string } };

type DashboardNavigationContext = {
  hasAssessments: boolean;
  hasTrainings: boolean;
  hasCohorts: boolean;
  hasHubs: boolean;
  adminRole: "admin" | "super_admin" | null;
  ledHubs: Array<{ id: string; name: string; slug: string }>;
};

const operationalGroups: DashboardNavigationGroup[] = [
  { label: "Network", items: [{ label: "Wayfinders", href: "/admin/users", icon: "wayfinders", requiresEntitlement: "wayfinders" }, { label: "Hubs", href: "/admin/hubs", icon: "hub", requiresEntitlement: "hubs" }, { label: "Partners", href: "/admin/partners", icon: "partners", requiresEntitlement: "partners" }] },
  { label: "Work", items: [{ label: "My Tasks", href: "/admin/tasks", icon: "tasks", requiresEntitlement: "my_tasks" }, { label: "Projects", href: "/admin/projects", icon: "projects", requiresEntitlement: "projects" }, { label: "Boards", href: "/admin/boards", icon: "boards", requiresEntitlement: "boards" }, { label: "Timeline", href: "/admin/timeline", icon: "timeline", requiresEntitlement: "timeline" }] },
  { label: "Communication", items: [{ label: "Channels", href: "/admin/channels", icon: "channels", requiresEntitlement: "channels" }, { label: "Messages", href: "/admin/messages", icon: "messages", requiresEntitlement: "messages" }, { label: "Notifications", href: "/admin/notifications", icon: "notifications", requiresEntitlement: "notifications" }] },
  { label: "Experiences", items: [{ label: "Assessments", href: "/admin/assessments", icon: "assessments", requiresEntitlement: "assessments" }, { label: "Manage Trainings", href: "/admin/trainings", icon: "trainings", requiresEntitlement: "manage_trainings" }, { label: "Cohorts", href: "/admin/cohorts", icon: "cohorts" }, { label: "Resources", href: "/admin/resources", icon: "resources" }] },
  { label: "Engagement", items: [{ label: "Events", href: "/admin/events", icon: "events" }, { label: "Forms", href: "/admin/forms", icon: "forms" }, { label: "Communications", href: "/admin/communications", icon: "communications" }] },
  { label: "Insights", items: [{ label: "Analytics", href: "/admin/analytics", icon: "analytics" }] },
  { label: "System", items: [{ label: "Access & Billing", href: "/admin/access", icon: "access" }, { label: "Automations", href: "/admin/automations", icon: "automations" }, { label: "Settings", href: "/admin/settings", icon: "settings" }] },
];

export function buildPersonalNavigation(): DashboardNavigationGroup[] {
  return [
    { label: "My Dashboard", items: [
      { label: "My Dashboard", href: "/dashboard", icon: "overview" },
      { label: "My Journey", href: "/my-journey", icon: "timeline" },
      { label: "Purpose Profile", href: "/purpose-profile", icon: "wayfinders" },
      { label: "My Trainings", href: "/dashboard#trainings", icon: "trainings" },
      { label: "My Assessments", href: "/dashboard#assessments", icon: "assessments" },
      { label: "My Cohorts", href: "/dashboard#community", icon: "cohorts" },
    ] },
    { label: "Explore", items: [
      { label: "Trainings", href: "/trainings", icon: "trainings" },
    ] },
    { label: "My Community", items: [
      { label: "Hubs & Communities", href: "/dashboard#community", icon: "hub" },
    ] },
    { label: "My Account", items: [
      { label: "Account Settings", href: "/account", icon: "settings" },
    ] },
  ];
}

export function isPersonalNavigationItemActive(pathname: string, hash: string, href: string) {
  const [targetPath, targetHash = ""] = href.split("#");
  if (pathname !== targetPath) return false;
  if (targetHash) return hash === `#${targetHash}`;
  return !hash || hash === "#overview";
}

export function buildOperationalNavigation(role: "admin" | "super_admin") {
  const groups = operationalGroups.map((group) => ({ ...group, items: [...group.items] }));
  groups[0].context = { label: "Admin Dashboard", href: "/admin" };
  if (role === "super_admin") groups.find((group) => group.label === "System")?.items.unshift({ label: "Classifications", href: "/admin/settings/classifications", icon: "settings" }, { label: "Administration", href: "/admin/admins", icon: "administration" });
  return groups;
}

export function filterNavigationByEntitlements(groups: DashboardNavigationGroup[], hasEntitlement: (key: string) => boolean) {
  return groups.map((group) => ({ ...group, items: group.items.filter((item) => !item.requiresEntitlement || hasEntitlement(item.requiresEntitlement)) })).filter((group) => group.items.length > 0 || group.context);
}

export function buildDashboardNavigation(context: DashboardNavigationContext): DashboardNavigationGroup[] {
  const personalJourney: DashboardNavigationItem[] = [{ label: "Overview", href: "#overview", icon: "overview" }];
  if (context.hasTrainings) personalJourney.push({ label: "My Trainings", href: "#trainings", icon: "trainings" });
  if (context.hasAssessments) personalJourney.push({ label: "Assessments", href: "#assessments", icon: "assessments" });
  if (context.hasCohorts) personalJourney.push({ label: "Cohorts", href: "#community", icon: "cohorts" });

  const groups: DashboardNavigationGroup[] = [{ label: "My Journey", items: personalJourney }];
  if (context.hasHubs || context.hasCohorts) groups.push({ label: "My Community", items: [{ label: "Hubs & Communities", href: "#community", icon: "hub" }] });

  if (context.ledHubs.length) groups.push({
    label: "Hub Management",
    context: { label: "Hub Dashboard", href: `/hubs/${context.ledHubs[0].slug}` },
    items: context.ledHubs.map((hub) => ({ label: context.ledHubs.length === 1 ? "Hub Overview" : hub.name, href: `/hubs/${hub.slug}`, icon: "hub" })),
  });

  if (context.adminRole) {
    groups.push(...buildOperationalNavigation(context.adminRole));
  }
  return groups;
}
