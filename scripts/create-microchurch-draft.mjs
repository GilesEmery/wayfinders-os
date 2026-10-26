import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const IDS = Object.freeze({
  experience: "b0e9d16d-3b3a-43f9-9faa-5bcae1951a24",
  version: "5ee3e95d-ee8a-4310-9c78-7856e397d068",
  module: "cc3a9d63-90d5-49ea-a9b9-41680b9915cc",
  lesson: "87c3b19e-03a0-4765-9ea5-7c31d659c1ad",
  section: "d334ca31-4038-49c4-a0ae-6b70b1be2377",
  layout: "3d4e8b09-16d5-404c-8750-38a18af5aba0",
  column: "021c9976-db30-4f5e-aec1-8d5a901caec9",
  block: "2cc0db62-d03d-417e-9c5c-caa2f412b60b",
});
const SLUG = "microchurch";
const RENDERER = "microchurch.v1";
const RESPONSE_KEY = "microchurch_assessment";

if (process.argv.includes("--plan")) { console.log(JSON.stringify({title:"Microchurch Assessment",subtitle:"Worship, Community, and Mission",ids:IDS,slug:SLUG,renderer:RENDERER,responseKey:RESPONSE_KEY,launchPath:`/experiences/${SLUG}`,mode:"unpublished draft + prebuilt registry registration",coursePlacement:"none",schemaChanges:"none"},null,2));process.exit(0); }

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) throw new Error("Load .env.local before inspecting the linked project.");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

const existing = await db.from("experiences").select("id,slug,name,status,current_published_version_id").eq("slug", SLUG).maybeSingle();
if (existing.error) throw existing.error;
if (existing.data && existing.data.id !== IDS.experience) throw new Error(`Slug ${SLUG} is already owned by a different Experience.`);
const version = await db.from("experience_versions").select("id,status,experience_id").eq("id", IDS.version).maybeSingle();
if (version.error) throw version.error;
if (version.data && (version.data.experience_id !== IDS.experience || version.data.status !== "draft")) throw new Error("The stable Version ID is not an editable Microchurch Assessment Draft.");

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
    await insert("experiences", { id: IDS.experience, slug: SLUG, name: "Microchurch Assessment", description: "Worship, Community, and Mission — evaluate your ecclesial minimum using 21 statements.", experience_type: "assessment", delivery_mode: "builder", status: "draft", accent_color: "#0054a1", visibility: "private", admission_policy: "open_enrollment" });
  } else if (existing.data.current_published_version_id) throw new Error("A published Microchurch Assessment already exists; this creator will not replace it.");
  await insert("experience_versions", { id: IDS.version, experience_id: IDS.experience, version_label: "Microchurch Assessment v1 Draft", status: "draft", title: "Microchurch Assessment", description: "Worship, Community, and Mission", published_at: null, release_type: "major", shell_mode: "enhanced", course_configuration: { terminology: { group_label: "stage" }, card: { eyebrow: "Guided Experience", headline: "Microchurch Assessment", supporting_text: "Worship, Community, and Mission — evaluate your ecclesial minimum using 21 statements.", image_resource_id: null }, appearance: { header_treatment: "minimal", reading_width: "wide", accent_color: "#0054a1", cover_resource_id: null, logo_resource_id: null, header_logo_mode: "purposeos", header_logo_resource_id: null, colors: {} } } });
  await insert("experience_modules", { id: IDS.module, experience_version_id: IDS.version, module_key: "microchurch", title: "Microchurch Assessment", description: null, sort_order: 0, is_required: true, requirement_level: "required", metadata: { source: "native", assessment_runtime: RENDERER } });
  await insert("experience_lessons", { id: IDS.lesson, module_id: IDS.module, experience_version_id: IDS.version, lesson_key: "worship-community-mission", title: "Microchurch Assessment", description: null, sort_order: 0, is_required: true, requirement_level: "required", completion_rule: "blocks_complete", metadata: { source: "native", assessment_runtime: RENDERER } });
  await insert("experience_sections", { id: IDS.section, lesson_id: IDS.lesson, module_id: IDS.module, experience_version_id: IDS.version, section_key: "assessment", title: "Microchurch Assessment", description: null, sort_order: 0, requirement_level: "required", renderer_mode: "builder", custom_renderer_key: null, completion_rule: "response_submitted", settings: {}, metadata: { source: "native", assessment_runtime: RENDERER } });
  await insert("section_layouts", { id: IDS.layout, section_id: IDS.section, layout_mode: "single_column", participant_resizing_enabled: false, settings: {} });
  await insert("section_columns", { id: IDS.column, section_layout_id: IDS.layout, section_id: IDS.section, column_key: "main", label: null, sort_order: 0, width_percent: 100, sticky: false, collapsible: false, default_collapsed: false, mobile_order: 0, mobile_behavior: "stack", settings: {} });
  await insert("content_blocks", { id: IDS.block, lesson_id: IDS.lesson, section_id: IDS.section, column_id: IDS.column, block_key: "microchurch", block_type: "custom_component", sort_order: 0, content: {}, settings: {}, requirement_level: "required", status: "active", visibility: "visible", completion_rule: "response_submitted", custom_renderer_key: RENDERER, metadata: { source: "native", assessment_runtime: RENDERER, schema_version: 1 } });
  const response = await db.from("response_definitions").insert({ lesson_id: IDS.lesson, experience_version_id: IDS.version, block_id: IDS.block, response_key: RESPONSE_KEY, response_type: "structured_response", label: "Microchurch Assessment", instructions: "Rate all 21 statements from 1 to 5 (most accurate). Save incomplete drafts; complete the whole assessment once.", is_required: true, configuration: { schemaVersion: 1, statementCount: 21, source: "UNDERGROUND, tampaunderground.com", scoring: { Worship: [1,3,5,6,10,13,20], Community: [4,8,11,12,15,17,19], Mission: [2,7,9,14,16,18,21] } }, raw_visibility: "participant_only", result_visibility: "participant_only", share_mode: "disabled", visibility_settings: {} });
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
