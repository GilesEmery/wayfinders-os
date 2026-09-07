import { AdminPageHeader, AdminShell } from "@/components/admin/AdminShell";
import { CreateWayfinderForm } from "@/components/admin/CreateWayfinderForm";
import { requireAdmin } from "@/lib/admin/auth";

export default async function Page() {
  const admin = await requireAdmin();
  return <AdminShell admin={admin}><AdminPageHeader eyebrow="Wayfinders" title="Create Wayfinder" description="Create the shared Purpose OS identity first. Additional access and journey relationships remain additive and separate."/><CreateWayfinderForm /></AdminShell>;
}
