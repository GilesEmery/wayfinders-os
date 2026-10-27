import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { AdminPageHeader, AdminShell } from "@/components/admin/AdminShell";
import { APEST_DRAFT, prepareApestDraft } from "@/lib/experiences/admin/apest-draft";

export default async function ApestSetupPage() {
  const admin = await requireAdmin();
  async function prepare() {
    "use server";
    await prepareApestDraft();
    revalidatePath("/admin/trainings");
    revalidatePath(`/admin/trainings/${APEST_DRAFT.experience}`);
    redirect(`/admin/trainings/${APEST_DRAFT.experience}/versions/${APEST_DRAFT.version}?section=${APEST_DRAFT.section}&saved=APEST+assessment+ready.`);
  }
  return <AdminShell admin={admin}><AdminPageHeader eyebrow="Assessments" title="Prepare APEST draft" description="Add the complete customized APEST assessment, including its introduction and results, to the existing private draft."/><p>This leaves the assessment unpublished and preserves your course image and appearance settings.</p><form action={prepare}><button className="admin-primary" type="submit">Prepare APEST draft</button></form></AdminShell>;
}
