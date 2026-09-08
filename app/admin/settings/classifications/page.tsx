import { ClassificationManager } from "@/components/admin/ClassificationManager";
import { AdminPageHeader, AdminShell } from "@/components/admin/AdminShell";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export default async function Page() {
  const identity = await requireSuperAdmin();
  const { data } = await createAdminSupabaseClient().from("tags").select("id,slug,name,description,category,status").order("name");
  return <AdminShell admin={identity}><AdminPageHeader eyebrow="System" title="Classifications" description="Manage reusable Wayfinder classification definitions. Stable slugs remain unchanged while display names and descriptions may evolve."/><ClassificationManager classifications={data ?? []}/></AdminShell>;
}
