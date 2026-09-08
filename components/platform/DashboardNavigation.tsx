import Link from "next/link";
import { DashboardSwitcher } from "@/components/platform/DashboardSwitcher";
import type { DashboardNavigationGroup } from "@/lib/platform/dashboard-navigation";

export function DashboardNavigation({ groups, showAdminDashboard }: { groups: DashboardNavigationGroup[]; showAdminDashboard: boolean }) {
  return <aside className="purpose-dashboard-nav"><DashboardSwitcher active="personal" showAdmin={showAdminDashboard}/><nav aria-label="Purpose OS dashboard navigation">{groups.map((group) => <section key={group.label}><h2>{group.label}</h2>{group.items.map((item) => <Link href={item.href} key={`${group.label}-${item.href}-${item.label}`}>{item.label}</Link>)}</section>)}</nav></aside>;
}
