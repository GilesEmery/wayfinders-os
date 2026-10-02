import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const IDS = Object.freeze({
  experience: "1689d5db-707f-5d4d-beaf-7e332998e74c",
  version: "03b51bfb-9b7a-5465-ae71-603fd486764b",
  module: "92354acc-698e-5893-bf5e-128d2f8a35f6",
  lesson: "6f5fecb8-6a50-56f7-81c8-f0a7dd181fed",
  section: "914bf754-bcdc-578b-9483-ce089cab79d1",
  layout: "d4e9e1a7-870f-575f-936d-c83640f895d1",
  column: "3eaa6ce7-18ee-5e66-890c-340325c8b75e",
  block: "1b6636f0-8e56-5880-8bb3-e4fe244c7d23",
});
const SLUG = "wayfinders-ethos";
const RENDERER = "wayfinders-ethos-assessment.v1";
const RESPONSE_KEY = "wayfinders_ethos_assessment";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) throw new Error("Load .env.local before inspecting the linked project.");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

const existing = await db.from("experiences").select("id,slug,name,status,current_published_version_id").eq("slug", SLUG).maybeSingle();
if (existing.error) throw existing.error;
if (existing.data && existing.data.id !== IDS.experience) throw new Error(`Slug ${SLUG} is already owned by a different Experience.`);
const version = await db.from("experience_versions").select("id,status,experience_id").eq("id", IDS.version).maybeSingle();
if (version.error) throw version.error;
if (version.data && (version.data.experience_id !== IDS.experience || version.data.status !== "draft")) throw new Error("The stable Version ID is not an editable Wayfinders Ethos Reflection Draft.");

const report = { mode: APPLY ? "apply" : "dry-run", experienceId: IDS.experience, versionId: IDS.version, slug: SLUG, rendererKey: RENDERER, responseKey: RESPONSE_KEY, existing: Boolean(existing.data), draftExists: Boolean(version.data), publication: "not requested", registry: "draft identity only; runtime requires publication" };
console.log(JSON.stringify(report, null, 2));
if (!APPLY || version.data) process.exit(0);
if (process.argv.find((arg) => arg.startsWith("--confirm=")) !== `--confirm=${IDS.experience}`) throw new Error(`Apply requires --confirm=${IDS.experience}`);

const created = [];
async function insert(table, row) {
  const result = await db.from(table).insert(row);
  if (result.error) throw new Error(`${table}: ${result.error.message}`);
  created.push([table, row.id]);
}

try {
  if (!existing.data) {
    await insert("experiences", { id: IDS.experience, slug: SLUG, name: "Wayfinders Ethos Reflection", description: "Reflect on your Wayfinders leadership and identify opportunities for growth.", experience_type: "assessment", delivery_mode: "builder", status: "draft", accent_color: "#252a29", visibility: "private", admission_policy: "open_enrollment" });
  } else if (existing.data.current_published_version_id) throw new Error("A published Wayfinders Ethos Reflection already exists; this creator will not replace it.");
  await insert("experience_versions", { id: IDS.version, experience_id: IDS.experience, version_label: "Wayfinders Ethos Reflection v1 Draft", status: "draft", title: "Wayfinders Ethos Reflection", description: "A guided Wayfinders assessment with saved results.", published_at: null, release_type: "major", shell_mode: "enhanced", course_configuration: { terminology: { group_label: "stage" }, card: { eyebrow: "Guided Experience", headline: "Wayfinders Ethos Reflection", supporting_text: "Reflect on your Wayfinders leadership and identify opportunities for growth.", image_resource_id: null }, appearance: { header_treatment: "minimal", reading_width: "wide", accent_color: "#252a29", cover_resource_id: null, logo_resource_id: null, header_logo_mode: "purposeos", header_logo_resource_id: null, colors: {} } } });
  await insert("experience_modules", { id: IDS.module, experience_version_id: IDS.version, module_key: "wayfinders-ethos", title: "Wayfinders Ethos Reflection", description: null, sort_order: 0, is_required: true, requirement_level: "required", metadata: { source: "native", assessment_runtime: RENDERER } });
  await insert("experience_lessons", { id: IDS.lesson, module_id: IDS.module, experience_version_id: IDS.version, lesson_key: "growth-assessment", title: "Wayfinders Ethos Reflection", description: null, sort_order: 0, is_required: true, requirement_level: "required", completion_rule: "blocks_complete", metadata: { source: "native", assessment_runtime: RENDERER } });
  await insert("experience_sections", { id: IDS.section, lesson_id: IDS.lesson, module_id: IDS.module, experience_version_id: IDS.version, section_key: "assessment", title: "Wayfinders Ethos Reflection", description: null, sort_order: 0, requirement_level: "required", renderer_mode: "builder", custom_renderer_key: null, completion_rule: "response_submitted", settings: {}, metadata: { source: "native", assessment_runtime: RENDERER } });
  await insert("section_layouts", { id: IDS.layout, section_id: IDS.section, layout_mode: "single_column", participant_resizing_enabled: false, settings: {} });
  await insert("section_columns", { id: IDS.column, section_layout_id: IDS.layout, section_id: IDS.section, column_key: "main", label: null, sort_order: 0, width_percent: 100, sticky: false, collapsible: false, default_collapsed: false, mobile_order: 0, mobile_behavior: "stack", settings: {} });
  await insert("content_blocks", { id: IDS.block, lesson_id: IDS.lesson, section_id: IDS.section, column_id: IDS.column, block_key: "wayfinders-ethos", block_type: "system_component", sort_order: 0, content: {}, settings: {}, requirement_level: "required", status: "active", visibility: "visible", completion_rule: "response_submitted", custom_renderer_key: RENDERER, metadata: { source: "native", assessment_runtime: RENDERER, schema_version: 1 } });
  const response = await db.from("response_definitions").insert({ lesson_id: IDS.lesson, experience_version_id: IDS.version, block_id: IDS.block, response_key: RESPONSE_KEY, response_type: "structured_response", label: "Wayfinders Ethos Reflection", instructions: "Answer every question, then explicitly finish your assessment.", is_required: true, configuration: { schemaVersion: 1, questionCount: 15 }, raw_visibility: "participant_only", result_visibility: "participant_only", share_mode: "disabled", visibility_settings: {} });
  if (response.error) throw new Error(`response_definitions: ${response.error.message}`);
  const registry = await db.from("prebuilt_assessments").insert({ experience_id: IDS.experience, launch_path: `/experiences/${SLUG}`, completion_provider: "experience_enrollment", status: "active" });
  if (registry.error) throw new Error(`prebuilt_assessments: ${registry.error.message}`);
  created.push(["prebuilt_assessments", IDS.experience]);
} catch (error) {
  for (const [table, id] of created.reverse()) await db.from(table).delete().eq(table === "prebuilt_assessments" ? "experience_id" : "id", id);
  throw error;
}

const verification = await Promise.all([
  db.from("experiences").select("id,slug,experience_type,delivery_mode,status,current_published_version_id").eq("id", IDS.experience).single(),
  db.from("experience_versions").select("id,status,title").eq("id", IDS.version).single(),
  db.from("content_blocks").select("id,block_type,custom_renderer_key,completion_rule").eq("id", IDS.block).single(),
  db.from("response_definitions").select("response_key,response_type,is_required,raw_visibility,result_visibility,share_mode").eq("block_id", IDS.block).single(),
]);
if (verification.some((result) => result.error)) throw new Error(`Verification failed: ${verification.map((result) => result.error?.message).filter(Boolean).join("; ")}`);
console.log(JSON.stringify({ created: true, experience: verification[0].data, version: verification[1].data, block: verification[2].data, response: verification[3].data }, null, 2));
