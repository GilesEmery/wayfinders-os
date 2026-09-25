import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const EXPERIENCE_ID = "cfa2f5cb-1546-4041-af1b-00196d605610";
const VERSION_ID = "35f0f44e-0c5e-43c0-8568-2c336a1de460";
const SECTION_ID = "6a3d7b32-e7e1-4971-9827-07e9ba21af2f";
const BLOCK_KEY = "launching-wayfinders-hub-assessment";
const RESPONSE_KEY = "launching_wayfinders_hub_assessment";
const RENDERER_KEY = "launching-wayfinders-hub-assessment.v1";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) throw new Error("Load .env.local so the target Course can be inspected.");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const version = await db.from("experience_versions").select("id,experience_id,status").eq("id", VERSION_ID).eq("experience_id", EXPERIENCE_ID).single();
if (version.error || !version.data || version.data.status !== "draft") throw new Error("The expected Hub Leader Cohort Draft is unavailable or is no longer a Draft.");
const section = await db.from("experience_sections").select("id,lesson_id,title,experience_version_id").eq("id", SECTION_ID).eq("experience_version_id", VERSION_ID).single();
if (section.error || section.data?.title !== "Launching Your Wayfinders Hub") throw new Error("The expected Launching Your Wayfinders Hub section is unavailable.");
const query = () => db.from("content_blocks").select("*").eq("section_id", SECTION_ID).order("sort_order").order("created_at");
const blocks = await query();
if (blocks.error) throw new Error(`Unable to inspect section Blocks: ${blocks.error.message}`);
const existing = blocks.data.find((block) => block.block_key === BLOCK_KEY || block.custom_renderer_key === RENDERER_KEY);
const pdf = blocks.data.find((block) => block.block_type === "pdf_reader");
const firstReflection = blocks.data.find((block) => block.block_type === "reflection");
if (!pdf?.column_id || !firstReflection || pdf.sort_order >= firstReflection.sort_order) throw new Error("Expected PDF followed by reflection content was not found.");
console.log(JSON.stringify({ apply: APPLY, versionStatus: version.data.status, section: section.data.title, existingAssessmentId: existing?.id ?? null, placement: "after the PDF and before the existing reflection Blocks" }, null, 2));
if (!APPLY || existing) process.exit(0);

const lessonBlocksResult = await db.from("content_blocks").select("id,section_id,sort_order").eq("lesson_id", section.data.lesson_id).order("sort_order").order("created_at");
if (lessonBlocksResult.error) throw new Error(`Unable to inspect Lesson Block order: ${lessonBlocksResult.error.message}`);
const lessonBlocks = lessonBlocksResult.data;
const maximum = Math.max(...lessonBlocks.map((block) => block.sort_order));
const inserted = await db.from("content_blocks").insert({ lesson_id: section.data.lesson_id, section_id: SECTION_ID, column_id: pdf.column_id, block_key: BLOCK_KEY, block_type: "custom_component", sort_order: maximum + 1, content: {}, settings: {}, requirement_level: "required", status: "active", visibility: "visible", completion_rule: "response_submitted", custom_renderer_key: RENDERER_KEY, metadata: { assessment: "launching_wayfinders_hub", schema_version: 1 } }).select("id").single();
if (inserted.error) throw new Error(`Unable to create assessment Block: ${inserted.error.message}`);
const definition = await db.from("response_definitions").insert({ lesson_id: section.data.lesson_id, experience_version_id: VERSION_ID, block_id: inserted.data.id, response_key: RESPONSE_KEY, response_type: "structured_response", label: "Launching Your Wayfinders Hub Assessment", instructions: "Complete all 10 ratings.", is_required: true, configuration: { schemaVersion: 1, scoreMinimum: 10, scoreMaximum: 50, ratingMinimum: 1, ratingMaximum: 5, questionCount: 10 }, raw_visibility: "participant_only", result_visibility: "participant_only", share_mode: "disabled", visibility_settings: {} });
if (definition.error) { await db.from("content_blocks").delete().eq("id", inserted.data.id); throw new Error(`Unable to create response definition: ${definition.error.message}`); }
const currentIds = lessonBlocks.map((block) => block.id);
const reflectionIndex = currentIds.indexOf(firstReflection.id);
const desiredIds = [...currentIds.slice(0, reflectionIndex), inserted.data.id, ...currentIds.slice(reflectionIndex)];
const slots = [...lessonBlocks.map((block) => block.sort_order), maximum + 1].sort((a, b) => a - b);
const temporaryOffset = maximum + slots.length + 100;
for (const [index, id] of desiredIds.entries()) { const moved = await db.from("content_blocks").update({ sort_order: temporaryOffset + index }).eq("id", id).eq("lesson_id", section.data.lesson_id); if (moved.error) throw new Error(`Unable to prepare Block order: ${moved.error.message}`); }
for (const [index, id] of desiredIds.entries()) { const moved = await db.from("content_blocks").update({ sort_order: slots[index] }).eq("id", id).eq("lesson_id", section.data.lesson_id); if (moved.error) throw new Error(`Unable to save Block order: ${moved.error.message}`); }
const loaded = await query();
if (loaded.error) throw new Error(`Builder-equivalent Block load failed: ${loaded.error.message}`);
const matches = loaded.data.filter((block) => block.custom_renderer_key === RENDERER_KEY);
const placedIndex = loaded.data.findIndex((block) => block.id === inserted.data.id);
if (matches.length !== 1 || loaded.data[placedIndex - 1]?.id !== pdf.id || loaded.data[placedIndex + 1]?.block_type !== "reflection") throw new Error("Post-placement verification failed.");
console.log(JSON.stringify({ applied: true, blockId: inserted.data.id, responseKey: RESPONSE_KEY, builderLoadCount: matches.length, order: loaded.data.map((block) => ({ blockType: block.block_type, renderer: block.custom_renderer_key, sortOrder: block.sort_order })) }, null, 2));
