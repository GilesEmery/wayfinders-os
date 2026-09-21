import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const EXPERIENCE_ID = "cfa2f5cb-1546-4041-af1b-00196d605610";
const VERSION_ID = "cbae41d9-7b29-410f-88b0-9c8819e59684";
const SECTION_ID = "12b119f9-35f2-4fa1-b103-2e1c8309d82b";
const BLOCK_KEY = "wayfinders-ethos-assessment";
const RESPONSE_KEY = "wayfinders_ethos_assessment";
const RENDERER_KEY = "wayfinders-ethos-assessment.v1";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) throw new Error("Load .env.local so the target Course can be inspected.");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

const section = await db.from("experience_sections").select("id,lesson_id,experience_version_id").eq("id", SECTION_ID).eq("experience_version_id", VERSION_ID).single();
if (section.error || !section.data) throw new Error(`Ethos Page unavailable: ${section.error?.message ?? "not found"}`);
const version = await db.from("experience_versions").select("id,experience_id,status").eq("id", VERSION_ID).eq("experience_id", EXPERIENCE_ID).single();
if (version.error || !version.data || version.data.status !== "draft") throw new Error("The expected editable Hub Leader Course Draft is unavailable.");
const blocks = await db.from("content_blocks").select("id,lesson_id,section_id,column_id,block_key,block_type,sort_order,custom_renderer_key").eq("lesson_id", section.data.lesson_id).order("sort_order");
if (blocks.error) throw new Error(`Unable to inspect Ethos Lesson Blocks: ${blocks.error.message}`);
const existing = blocks.data.find((block) => block.block_key === BLOCK_KEY || block.custom_renderer_key === RENDERER_KEY);
const pageBlocks = blocks.data.filter((block) => block.section_id === SECTION_ID);
const pdf = pageBlocks.find((block) => block.block_type === "pdf_reader");
const description = pageBlocks.find((block) => block.block_type === "rich_text");
if (!pdf?.column_id || !description || pdf.sort_order <= description.sort_order) throw new Error("Expected Ethos description followed by the PDF was not found.");

console.log(JSON.stringify({ apply: APPLY, versionStatus: version.data.status, sectionId: SECTION_ID, lessonId: section.data.lesson_id, existingAssessmentId: existing?.id ?? null, placement: "after Ethos description, before PDF", pdfId: pdf.id }, null, 2));
if (!APPLY || existing) process.exit(0);

const maximum = Math.max(...blocks.data.map((block) => block.sort_order));
const inserted = await db.from("content_blocks").insert({ lesson_id: section.data.lesson_id, section_id: SECTION_ID, column_id: pdf.column_id, block_key: BLOCK_KEY, block_type: "system_component", sort_order: maximum + 1, content: {}, settings: {}, requirement_level: "required", status: "active", visibility: "visible", completion_rule: "response_submitted", custom_renderer_key: RENDERER_KEY, metadata: { assessment: "wayfinders_ethos", schema_version: 1 } }).select("id").single();
if (inserted.error) throw new Error(`Unable to create Ethos Assessment Block: ${inserted.error.message}`);

const definition = await db.from("response_definitions").insert({ lesson_id: section.data.lesson_id, experience_version_id: VERSION_ID, block_id: inserted.data.id, response_key: RESPONSE_KEY, response_type: "structured_response", label: "Wayfinders Ethos Assessment", instructions: "Complete all 15 ratings.", is_required: true, configuration: { schemaVersion: 1, scoreMinimum: 1, scoreMaximum: 5, questionCount: 15, categoryCount: 5 }, raw_visibility: "participant_only", result_visibility: "participant_only", share_mode: "disabled", visibility_settings: {} });
if (definition.error) { await db.from("content_blocks").delete().eq("id", inserted.data.id); throw new Error(`Unable to create Ethos response definition: ${definition.error.message}`); }

const currentIds = blocks.data.map((block) => block.id);
const pdfIndex = currentIds.indexOf(pdf.id);
const desiredIds = [...currentIds.slice(0, pdfIndex), inserted.data.id, ...currentIds.slice(pdfIndex)];
const slots = [...blocks.data.map((block) => block.sort_order), maximum + 1].sort((left, right) => left - right);
const temporaryOffset = maximum + slots.length + 100;
for (const [index, id] of desiredIds.entries()) {
  const moved = await db.from("content_blocks").update({ sort_order: temporaryOffset + index }).eq("id", id).eq("lesson_id", section.data.lesson_id);
  if (moved.error) throw new Error(`Unable to prepare Ethos Block order: ${moved.error.message}`);
}
for (const [index, id] of desiredIds.entries()) {
  const moved = await db.from("content_blocks").update({ sort_order: slots[index] }).eq("id", id).eq("lesson_id", section.data.lesson_id);
  if (moved.error) throw new Error(`Unable to save Ethos Block order: ${moved.error.message}`);
}
console.log(JSON.stringify({ applied: true, blockId: inserted.data.id, responseKey: RESPONSE_KEY }, null, 2));
