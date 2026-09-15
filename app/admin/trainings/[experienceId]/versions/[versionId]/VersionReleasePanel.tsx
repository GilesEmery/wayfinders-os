import Link from "next/link";
import type { BuilderCourseStructure } from "@/lib/experiences/builder/types";
import { formatDate } from "@/lib/admin/format";
import { cloneVersionAction, publishVersionAction } from "./release-actions";

export function VersionReleasePanel({ structure, basedOnLabel }: { structure: BuilderCourseStructure; basedOnLabel: string | null }) {
  const { experience, version } = structure;
  const base = `/admin/trainings/${experience.id}/versions/${version.id}`;
  const current = experience.current_published_version_id === version.id;
  return <section className="admin-panel curriculum-release-panel">
    <p className="admin-kicker">Version workflow</p>
    <h2>{version.status === "draft" ? "Build, preview, publish" : version.status === "published" ? "Published Version" : "Archived Version"}</h2>
    <p>{version.status === "published"
      ? `${current ? "Current participant-facing Version. " : "Published, but not the current Version. "}Published ${formatDate(version.published_at)}. Curriculum is read-only; create a new Draft for edits.`
      : version.status === "draft" ? "Draft curriculum is editable and can be previewed without saving participant responses or progress." : "This archived Version is read-only."}</p>
    {basedOnLabel && <p>Based on Version {basedOnLabel}.</p>}
    <div className="curriculum-release-links">
      {version.status === "draft" && <Link href={`${base}#curriculum`}>Edit Curriculum</Link>}
      <Link href={`${base}/preview`}>{version.status === "draft" ? "Preview as Participant" : "Preview"}</Link>
      {version.status === "published" && <Link href={`${base}/enroll`}>Enroll Participant / Manage Enrollment</Link>}
    </div>
    {version.status === "draft" && <details className="curriculum-release-confirm">
      <summary>Publish Version</summary>
      <p>Publishing makes this Version participant-facing and sets it as the current Published Version. Published curriculum is immutable in the normal Builder; future edits belong in a new Draft.</p>
      <form action={publishVersionAction.bind(null, experience.id, version.id)}>
        <label><input type="checkbox" name="confirm_publish" value="yes" required/> I understand and confirm publication.</label>
        <button className="admin-primary" type="submit">Publish Version {version.version_label}</button>
      </form>
    </details>}
    {version.status === "published" && <form action={cloneVersionAction.bind(null, experience.id, version.id)} className="admin-inline-form curriculum-clone-form">
      <label>New Draft Version label<input name="version_label" required maxLength={80} placeholder="0.2"/></label>
      <button className="admin-primary" type="submit">Create New Draft</button>
      <p>A repeated submission with the same label will be rejected; choose a fresh label for each intended Draft.</p>
    </form>}
  </section>;
}
