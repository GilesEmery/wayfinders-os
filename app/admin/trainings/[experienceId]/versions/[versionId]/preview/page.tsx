import { notFound, redirect } from "next/navigation";
import { flattenCourseSections } from "@/components/experiences/builder/CourseNavigator";
import { getAdminCoursePreview, adminPreviewHref } from "@/lib/experiences/admin/preview";

export default async function PreviewEntry({ params }: { params: Promise<{ experienceId: string; versionId: string }> }) {
  const { experienceId, versionId } = await params;
  let preview;
  try { preview = await getAdminCoursePreview(experienceId, versionId); } catch { notFound(); }
  const first = flattenCourseSections(preview.structure)[0];
  if (!first) return <main className="participant-course-state"><p className="platform-eyebrow">Admin Preview</p><h1>No Pages to preview</h1><p>Add a Page to this Version before previewing the course.</p></main>;
  redirect(adminPreviewHref(experienceId, versionId, first.moduleKey, first.lessonKey, first.section.section_key));
}
