import { createClient } from "@supabase/supabase-js";

const IDS = Object.freeze({ experience: "8ccd1802-f9c2-493d-bcc8-73885008096b", version: "c59b15e8-b9a7-4745-95b6-8c1b24c49c2d", module: "b9bef5fe-7975-46ff-8fb1-67fa56832d8f", lesson: "f0f719e6-6fc8-451d-90d3-5bce97a12a60", section: "90ea1f76-0ec3-4299-b490-1883b32a3210", layout: "702de41d-1e92-496f-9698-f48a039ac115", column: "18e4b96a-2740-4235-89c0-a7d4fdb774ca", block: "ba2d9497-eec7-41d2-80ba-9b785987692e" });
const APPLY = process.argv.includes("--apply");
const plan = { mode: APPLY ? "apply" : "dry-run", ...IDS, slug: "start-something", rendererKey: "start-something.v1", responseKey: "start_something", visibility: "private", publication: false, reusableRegistryActivation: false };
console.log(JSON.stringify(plan, null, 2));
if (!APPLY) process.exit(0);
if (process.argv.find((arg) => arg.startsWith("--confirm=")) !== `--confirm=${IDS.experience}`) throw new Error(`Apply requires --confirm=${IDS.experience}`);
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) throw new Error("Load an explicitly authorized environment before applying.");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const existing = await db.from("experiences").select("id,experience_type,delivery_mode,status,visibility,admission_policy,current_published_version_id").eq("slug", "start-something").maybeSingle();
if (existing.error) throw existing.error;
if (existing.data && existing.data.id !== IDS.experience) throw new Error("The start-something slug belongs to another Experience.");
if (existing.data?.current_published_version_id) throw new Error("This creator will not replace a published Experience.");
if (existing.data && (
  existing.data.status !== "draft"
  || existing.data.visibility !== "private"
  || existing.data.admission_policy !== "admin_assigned"
)) throw new Error("The existing Start Something shell is no longer an inert private Draft. Re-audit before reuse.");
const existingVersion = await db.from("experience_versions").select("id,status").eq("id", IDS.version).maybeSingle();
if (existingVersion.error) throw existingVersion.error;
if (existingVersion.data) { if (existingVersion.data.status !== "draft") throw new Error("Reserved Version is not Draft."); process.exit(0); }
const created = [];
async function insert(table, row) { const result = await db.from(table).insert(row); if (result.error) throw new Error(`${table}: ${result.error.message}`); created.push([table, row.id]); }
try {
  if (!existing.data) await insert("experiences", { id: IDS.experience, slug: "start-something", name: "Start Something", description: "Move a meaningful idea toward vision, strategy, relationships, and a practical next step.", experience_type: "assessment", delivery_mode: "builder", status: "draft", accent_color: "#0054A1", visibility: "private", admission_policy: "admin_assigned" });
  else {
    const reused = await db.from("experiences").update({
      name: "Start Something",
      description: "Move a meaningful idea toward vision, strategy, relationships, and a practical next step.",
      experience_type: "assessment",
      delivery_mode: "builder",
      accent_color: "#0054A1",
    }).eq("id", IDS.experience).is("current_published_version_id", null).eq("status", "draft").eq("visibility", "private").eq("admission_policy", "admin_assigned").select("id").maybeSingle();
    if (reused.error || !reused.data) throw new Error("The existing private Start Something shell changed during reconciliation.");
  }
  await insert("experience_versions", { id: IDS.version, experience_id: IDS.experience, version_label: "Start Something v1 Draft", status: "draft", title: "Start Something", description: "A six-stage unscored guided experience.", release_type: "major", shell_mode: "enhanced", course_configuration: { terminology: { group_label: "stage" }, card: { eyebrow: "Guided Experience", headline: "Start Something", supporting_text: "Move an idea toward thoughtful, meaningful action.", image_resource_id: null }, appearance: { header_treatment: "minimal", reading_width: "wide", accent_color: "#0054A1", colors: { accent: "#F5BD00", surface: "#F8F5EC", text: "#252A29" } } } });
  await insert("experience_modules", { id: IDS.module, experience_version_id: IDS.version, module_key: "start-something", title: "Start Something", sort_order: 0, is_required: true, requirement_level: "required", metadata: { source: "native", assessment_runtime: "start-something.v1" } });
  await insert("experience_lessons", { id: IDS.lesson, module_id: IDS.module, experience_version_id: IDS.version, lesson_key: "guided-workbook", title: "Start Something", sort_order: 0, is_required: true, requirement_level: "required", completion_rule: "blocks_complete", metadata: { source: "native", assessment_runtime: "start-something.v1" } });
  await insert("experience_sections", { id: IDS.section, lesson_id: IDS.lesson, module_id: IDS.module, experience_version_id: IDS.version, section_key: "experience", title: "Start Something", sort_order: 0, requirement_level: "required", renderer_mode: "builder", completion_rule: "response_submitted", settings: {}, metadata: { source: "native", assessment_runtime: "start-something.v1" } });
  await insert("section_layouts", { id: IDS.layout, section_id: IDS.section, layout_mode: "single_column", participant_resizing_enabled: false, settings: {} });
  await insert("section_columns", { id: IDS.column, section_layout_id: IDS.layout, section_id: IDS.section, column_key: "main", sort_order: 0, width_percent: 100, sticky: false, collapsible: false, default_collapsed: false, mobile_order: 0, mobile_behavior: "stack", settings: {} });
  await insert("content_blocks", { id: IDS.block, lesson_id: IDS.lesson, section_id: IDS.section, column_id: IDS.column, block_key: "start-something", block_type: "custom_component", sort_order: 0, content: {}, settings: {}, requirement_level: "required", status: "active", visibility: "visible", completion_rule: "response_submitted", custom_renderer_key: "start-something.v1", metadata: { source: "native", schema_version: 1 } });
  const response = await db.from("response_definitions").insert({ lesson_id: IDS.lesson, experience_version_id: IDS.version, block_id: IDS.block, response_key: "start_something", response_type: "structured_response", label: "Start Something", instructions: "Finish when you are ready to preserve a completed result snapshot.", is_required: true, configuration: { schemaVersion: 1, stageCount: 6, optionalReflections: true }, raw_visibility: "participant_only", result_visibility: "participant_only", share_mode: "disabled", visibility_settings: {} });
  if (response.error) throw new Error(`response_definitions: ${response.error.message}`);
} catch (error) { for (const [table, id] of created.reverse()) await db.from(table).delete().eq("id", id); throw error; }
