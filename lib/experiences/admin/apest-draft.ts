import "server-only";
import { audit, requireAdmin } from "@/lib/admin/auth";
import { getAuthorizationContext, canBuildExperienceById } from "@/lib/platform/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { APEST_RENDERER_KEY, APEST_RESPONSE_KEY } from "@/lib/experiences/builder/apest";

export const APEST_DRAFT = {
  experience: "6c442633-9fc0-4783-a9ab-ce9765c5dcda",
  version: "0a34fadd-5817-4600-a530-c7caa8ec62be",
  section: "a1940e72-f119-4506-b9ac-7c77c536f8d9",
  introduction: "06c0d14f-45ad-4e85-8247-88676689b6a1",
  block: "c83bf6f6-ebd9-5380-9835-08b15bdc9311",
} as const;

/** Install the complete source-controlled assessment into its private, unpublished shell. */
export async function prepareApestDraft() {
  const admin = await requireAdmin();
  const context = await getAuthorizationContext(admin.id, admin.email);
  if (!await canBuildExperienceById(context, APEST_DRAFT.experience)) throw new Error("You are not authorized to edit this assessment.");
  const db = createAdminSupabaseClient();
  const [experience, version, section, column] = await Promise.all([
    db.from("experiences").select("id,slug,status,current_published_version_id,experience_type").eq("id", APEST_DRAFT.experience).single(),
    db.from("experience_versions").select("id,status,experience_id").eq("id", APEST_DRAFT.version).single(),
    db.from("experience_sections").select("id,lesson_id,module_id").eq("id", APEST_DRAFT.section).eq("experience_version_id", APEST_DRAFT.version).single(),
    db.from("section_columns").select("id").eq("section_id", APEST_DRAFT.section).order("sort_order").limit(1).single(),
  ]);
  if (experience.error || version.error || section.error || column.error || experience.data.slug !== "apest" || experience.data.experience_type !== "assessment" || experience.data.status !== "draft" || experience.data.current_published_version_id || version.data.status !== "draft" || version.data.experience_id !== APEST_DRAFT.experience) throw new Error("Only the unpublished APEST draft can be prepared here.");
  const native = await db.from("content_blocks").select("id,section_id,custom_renderer_key").eq("id", APEST_DRAFT.block).maybeSingle();
  if (native.error || (native.data && (native.data.section_id !== APEST_DRAFT.section || native.data.custom_renderer_key !== APEST_RENDERER_KEY))) throw new Error("Assessment content could not be verified.");
  if (!native.data) {
    const last = await db.from("content_blocks").select("sort_order").eq("lesson_id", section.data.lesson_id).order("sort_order", { ascending: false }).limit(1).maybeSingle();
    if (last.error) throw new Error("Unable to determine assessment placement.");
    const result = await db.from("content_blocks").insert({ id: APEST_DRAFT.block, lesson_id: section.data.lesson_id, section_id: APEST_DRAFT.section, column_id: column.data.id, block_key: "apest", block_type: "custom_component", sort_order: (last.data?.sort_order ?? -1) + 1, content: {}, settings: {}, requirement_level: "required", status: "active", visibility: "visible", completion_rule: "response_submitted", custom_renderer_key: APEST_RENDERER_KEY, metadata: { source: "native", schema_version: 1 } });
    if (result.error) throw new Error("Unable to prepare assessment content.");
  }
  const definition = await db.from("response_definitions").select("id,response_key,response_type").eq("block_id", APEST_DRAFT.block).eq("experience_version_id", APEST_DRAFT.version).maybeSingle();
  if (definition.error || (definition.data && (definition.data.response_key !== APEST_RESPONSE_KEY || definition.data.response_type !== "structured_response"))) throw new Error("Assessment response settings could not be verified.");
  if (!definition.data) {
    const result = await db.from("response_definitions").insert({ lesson_id: section.data.lesson_id, experience_version_id: APEST_DRAFT.version, block_id: APEST_DRAFT.block, response_key: APEST_RESPONSE_KEY, response_type: "structured_response", label: "APEST Assessment", instructions: "Choose how often each statement describes you.", is_required: true, configuration: { schemaVersion: 1, questionCount: 25 }, raw_visibility: "participant_only", result_visibility: "participant_only", share_mode: "disabled", visibility_settings: {} });
    if (result.error) throw new Error("Unable to prepare assessment responses.");
  }
  const registration = await db.from("prebuilt_assessments").upsert({ experience_id: APEST_DRAFT.experience, launch_path: "/experiences/apest", completion_provider: "experience_enrollment", status: "active" }, { onConflict: "experience_id" });
  if (registration.error) throw new Error("Unable to register the reusable assessment.");
  const updates = await Promise.all([
    db.from("content_blocks").update({ status: "archived", visibility: "hidden" }).eq("id", APEST_DRAFT.introduction).eq("section_id", APEST_DRAFT.section),
    db.from("experience_sections").update({ requirement_level: "required", completion_rule: "response_submitted" }).eq("id", APEST_DRAFT.section).eq("experience_version_id", APEST_DRAFT.version),
    db.from("experiences").update({ admission_policy: "open_enrollment" }).eq("id", APEST_DRAFT.experience).eq("status", "draft").is("current_published_version_id", null),
  ]);
  if (updates.some(result => result.error)) throw new Error("The assessment was prepared, but its draft settings need to be retried.");
  await audit(admin, "prepared_native_apest_draft", "experience", APEST_DRAFT.experience, { versionId: APEST_DRAFT.version, renderer: APEST_RENDERER_KEY });
}
