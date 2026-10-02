import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const IDS = Object.freeze({
  experience: "49dcae2d-5443-4049-8433-666965c1f6ff",
  version: "488b6ee0-28c1-470f-b095-3228b20a4d33",
  module: "dacd7105-09f2-4ec9-b405-32e050b0654d",
  lesson: "0de1f537-f520-4a95-a9f6-a0fd30610ede",
  section: "16bce708-3a41-4267-80d4-0bf81c23c54a",
  layout: "bacfd558-3a3d-4800-837c-4641f1507aed",
  column: "f62d108e-51c0-4925-9eee-17e7c946a0f2",
  block: "af74b801-e151-4518-a7a2-598532d7c1d0",
});
const SLUG = "activate-your-purpose";
const RENDERER = "activate-your-purpose-assessment.v1";
const RESPONSE_KEY = "activate_your_purpose_assessment";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) throw new Error("Load .env.local before inspecting the linked project.");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

const existing = await db.from("experiences").select("id,slug,name,status,current_published_version_id").eq("slug", SLUG).maybeSingle();
if (existing.error) throw existing.error;
if (existing.data && existing.data.id !== IDS.experience) throw new Error(`Slug ${SLUG} is already owned by a different Experience.`);
const version = await db.from("experience_versions").select("id,status,experience_id").eq("id", IDS.version).maybeSingle();
if (version.error) throw version.error;
if (version.data && (version.data.experience_id !== IDS.experience || version.data.status !== "draft")) throw new Error("The stable Version ID is not an editable Activate Your Purpose Draft.");

const report = { mode: APPLY ? "apply" : "dry-run", experienceId: IDS.experience, versionId: IDS.version, slug: SLUG, rendererKey: RENDERER, responseKey: RESPONSE_KEY, existing: Boolean(existing.data), draftExists: Boolean(version.data), publication: "not requested", registry: "not requested" };
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
    await insert("experiences", { id: IDS.experience, slug: SLUG, name: "Activate Your Purpose", description: "Discover your current growth stage as an Everyday Disciple, Everyday Leader, and Everyday Impact.", experience_type: "assessment", delivery_mode: "builder", status: "draft", accent_color: "#252a29", visibility: "private", admission_policy: "admin_assigned" });
  } else if (existing.data.current_published_version_id) throw new Error("A published Activate Your Purpose already exists; this creator will not replace it.");
  await insert("experience_versions", { id: IDS.version, experience_id: IDS.experience, version_label: "Activate Your Purpose v1 Draft", status: "draft", title: "Activate Your Purpose", description: "A fifteen-question guided assessment of current growth as an Everyday Disciple, Everyday Leader, and Everyday Impact.", published_at: null, release_type: "major", shell_mode: "enhanced", course_configuration: { terminology: { group_label: "stage" }, card: { eyebrow: "Guided Experience", headline: "Activate Your Purpose", supporting_text: "Discover your current growth stage as an Everyday Disciple, Everyday Leader, and Everyday Impact.", image_resource_id: null }, appearance: { header_treatment: "minimal", reading_width: "wide", accent_color: "#252a29", cover_resource_id: null, logo_resource_id: null, header_logo_mode: "purposeos", header_logo_resource_id: null, colors: {} } } });
  await insert("experience_modules", { id: IDS.module, experience_version_id: IDS.version, module_key: "activate-your-purpose", title: "Activate Your Purpose", description: null, sort_order: 0, is_required: true, requirement_level: "required", metadata: { source: "native", assessment_runtime: RENDERER } });
  await insert("experience_lessons", { id: IDS.lesson, module_id: IDS.module, experience_version_id: IDS.version, lesson_key: "growth-assessment", title: "Activate Your Purpose", description: null, sort_order: 0, is_required: true, requirement_level: "required", completion_rule: "blocks_complete", metadata: { source: "native", assessment_runtime: RENDERER } });
  await insert("experience_sections", { id: IDS.section, lesson_id: IDS.lesson, module_id: IDS.module, experience_version_id: IDS.version, section_key: "assessment", title: "Activate Your Purpose", description: null, sort_order: 0, requirement_level: "required", renderer_mode: "builder", custom_renderer_key: null, completion_rule: "response_submitted", settings: {}, metadata: { source: "native", assessment_runtime: RENDERER } });
  await insert("section_layouts", { id: IDS.layout, section_id: IDS.section, layout_mode: "single_column", participant_resizing_enabled: false, settings: {} });
  await insert("section_columns", { id: IDS.column, section_layout_id: IDS.layout, section_id: IDS.section, column_key: "main", label: null, sort_order: 0, width_percent: 100, sticky: false, collapsible: false, default_collapsed: false, mobile_order: 0, mobile_behavior: "stack", settings: {} });
  await insert("content_blocks", { id: IDS.block, lesson_id: IDS.lesson, section_id: IDS.section, column_id: IDS.column, block_key: "activate-your-purpose", block_type: "custom_component", sort_order: 0, content: {}, settings: {}, requirement_level: "required", status: "active", visibility: "visible", completion_rule: "response_submitted", custom_renderer_key: RENDERER, metadata: { source: "native", assessment_runtime: RENDERER, schema_version: 1 } });
  const response = await db.from("response_definitions").insert({ lesson_id: IDS.lesson, experience_version_id: IDS.version, block_id: IDS.block, response_key: RESPONSE_KEY, response_type: "structured_response", label: "Activate Your Purpose", instructions: "Answer all fifteen questions, then explicitly finish your assessment.", is_required: true, configuration: { schemaVersion: 1, questionCount: 15 }, raw_visibility: "participant_only", result_visibility: "participant_only", share_mode: "disabled", visibility_settings: {} });
  if (response.error) throw new Error(`response_definitions: ${response.error.message}`);
} catch (error) {
  for (const [table, id] of created.reverse()) await db.from(table).delete().eq("id", id);
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
