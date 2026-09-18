import { notFound, redirect } from "next/navigation";
import { flattenCourseSections } from "@/components/experiences/builder/CourseNavigator";
import { getAdminCoursePreview, adminPreviewHref } from "@/lib/experiences/admin/preview";

export default async function PreviewEntry({ params, searchParams }: { params: Promise<{ experienceId: string; versionId: string }>; searchParams: Promise<{ cohort?: string | string[] }> }) {
  const [{ experienceId, versionId }, query] = await Promise.all([params, searchParams]);
  const cohortId = typeof query.cohort === "string" && query.cohort ? query.cohort : null;
  let preview;
  try { preview = await getAdminCoursePreview(experienceId, versionId, cohortId); } catch { notFound(); }
  const first = flattenCourseSections(preview.structure)[0];
  if (!first) return <main className="participant-course-state"><p className="platform-eyebrow">Admin Preview</p><h1>No Pages to preview</h1><p>Add a Page to this Version before previewing the course.</p></main>;
  redirect(adminPreviewHref(experienceId, versionId, first.moduleKey, first.lessonKey, first.section.section_key, cohortId));
}
