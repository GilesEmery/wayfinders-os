import "server-only";

import { audit, requireAdmin } from "@/lib/admin/auth";
import { canBuildExperienceById, getAuthorizationContext } from "@/lib/platform/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json, TablesInsert } from "@/lib/supabase/database.types";
import { getBlockDefinition, parseBlockConfiguration } from "../builder/block-registry";
import { assertVersionEditable, validateBuilderBlockPlacement } from "../builder/validation";
import { uploadCourseAsset } from "../builder/resource-assets";

type Db = ReturnType<typeof createAdminSupabaseClient>;
type Direction = "up" | "down";
const REQUIREMENTS = new Set(["required", "recommended", "optional"]);
const VISIBILITIES = new Set(["visible", "hidden"]);
const MEDIA_TYPES = new Set(["video", "image", "document", "download", "external_link"]);

function resourceType(blockType: string) {
  return blockType === "document" ? "pdf" : blockType === "external_link" ? "link" : blockType;
}

async function linkExternalResource(db: Db, blockId: string, blockType: string, content: Record<string, unknown>, actorId: string) {
  const url = String(content.url ?? "");
  if (!url) return;
  const type = resourceType(blockType);
  const existing = await db.from("resources").select("id").eq("resource_type", type).eq("external_url", url).eq("status", "active").order("created_at").limit(1).maybeSingle();
  if (existing.error) throw new Error(`Unable to find reusable Resource: ${existing.error.message}`);
  let resourceId = existing.data?.id;
  if (!resourceId) {
    const created = await db.from("resources").insert({ title: String(content.title || blockType), description: String(content.description || "") || null, resource_type: type, status: "active", external_url: url, storage_bucket: null, storage_path: null, metadata: {}, created_by: actorId }).select("id").single();
    if (created.error) throw new Error(`Unable to create URL Resource: ${created.error.message}`);
    resourceId = created.data.id;
  }
  const links = await db.from("content_block_resources").select("resource_id").eq("content_block_id", blockId);
  if (links.error) throw new Error(`Unable to inspect Block Resource links: ${links.error.message}`);
  if (!links.data?.some((link) => link.resource_id === resourceId)) {
    const inserted = await db.from("content_block_resources").insert({ content_block_id: blockId, resource_id: resourceId, sort_order: 0 });
    if (inserted.error) throw new Error(`Unable to link Resource: ${inserted.error.message}`);
  }
  const stale = (links.data ?? []).filter((link) => link.resource_id !== resourceId).map((link) => link.resource_id);
  if (stale.length) {
    const removed = await db.from("content_block_resources").delete().eq("content_block_id", blockId).in("resource_id", stale);
    if (removed.error) throw new Error(`Unable to unlink old Resource: ${removed.error.message}`);
  }
}

function slug(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72) || "block";
}

function optionConfiguration(form: FormData, multi: boolean) {
  const indices = [...new Set([...form.keys()].map((key) => /^option_(?:enabled|key|label|description|order)_(\d+)$/.exec(key)?.[1]).filter((value): value is string => Boolean(value)))];
  const used = new Set<string>();
  const options = indices.filter((index) => form.get(`option_enabled_${index}`) === "on").map((index, position) => {
    const label = String(form.get(`option_label_${index}`) ?? "").trim();
    const requested = String(form.get(`option_key_${index}`) ?? "").trim();
    const base = slug(requested || label || `option-${position + 1}`);
    let key = base;
    if (!requested) for (let suffix = 2; used.has(key); suffix += 1) key = `${base}-${suffix}`;
    used.add(key);
    return { key, label, description: String(form.get(`option_description_${index}`) ?? "").trim(), sortOrder: position };
  });
  return multi ? { options, minSelections: Number(form.get("min_selections")), maxSelections: Number(form.get("max_selections")) } : { options };
}

function formConfiguration(blockType: string, form: FormData): unknown {
  if (blockType === "heading") return { text: form.get("text"), level: form.get("level"), eyebrow: form.get("eyebrow") ?? "", alignment: form.get("alignment") };
  if (blockType === "rich_text") return { title: form.get("title") ?? "", text: form.get("text") };
  if (blockType === "callout") return { title: form.get("title") ?? "", body: form.get("body"), treatment: form.get("treatment") };
  if (blockType === "structured_response" || blockType === "reflection") return { placeholder: form.get("placeholder") ?? "", maxLength: Number(form.get("max_length")) };
  if (blockType === "card_selection") return optionConfiguration(form, false);
  if (blockType === "checklist") return optionConfiguration(form, true);
  if (blockType === "check_in") return { affirmativeLabel: form.get("affirmative_label") };
  if (blockType === "pdf_reader") return { title: form.get("title") ?? "", description: form.get("description") ?? "", readerMode: form.get("reader_mode") ?? "reader", showReader: form.has("show_reader"), allowDownload: form.has("allow_download"), allowOpenInNewTab: form.has("allow_open_in_new_tab") };
  if (["video", "image", "document", "download", "external_link"].includes(blockType)) return { title: form.get("title") ?? "", description: form.get("description") ?? "", url: form.get("url") ?? "", caption: form.get("caption") ?? "", alt: form.get("alt") ?? "", linkLabel: form.get("link_label") ?? "" };
  throw new Error(`Unavailable Block type: ${blockType}.`);
}

function responsePayload(definition: NonNullable<ReturnType<typeof getBlockDefinition>>, blockId: string, lessonId: string, versionId: string, responseKey: string, configuration: Json, label?: string, instructions?: string | null, required = false): TablesInsert<"response_definitions"> {
  if (!definition.response) throw new Error("This Block does not support responses.");
  return { block_id: blockId, lesson_id: lessonId, experience_version_id: versionId, response_key: responseKey, response_type: definition.response.responseType, label: label?.trim() || definition.label, instructions: instructions?.trim() || null, is_required: required, configuration, raw_visibility: "participant_only", result_visibility: "participant_only", share_mode: "disabled", visibility_settings: {} };
}

async function context(experienceId: string, versionId: string, sectionId: string) {
  const admin = await requireAdmin();
  const authorization = await getAuthorizationContext(admin.id, admin.email);
  if (!await canBuildExperienceById(authorization, experienceId)) throw new Error("You are not authorized to author this Experience.");
  const db = createAdminSupabaseClient();
  const [version, section, layout] = await Promise.all([
    db.from("experience_versions").select("id,status").eq("id", versionId).eq("experience_id", experienceId).maybeSingle(),
    db.from("experience_sections").select("id,lesson_id,module_id,experience_version_id").eq("id", sectionId).eq("experience_version_id", versionId).maybeSingle(),
    db.from("section_layouts").select("id,section_id").eq("section_id", sectionId).maybeSingle(),
  ]);
  if (version.error || section.error || layout.error || !version.data || !section.data || !layout.data) throw new Error("The Block authoring hierarchy is incomplete or does not match this Version.");
  assertVersionEditable(version.data.status);
  const [lesson, columns] = await Promise.all([
    db.from("experience_lessons").select("id,module_id,experience_version_id").eq("id", section.data.lesson_id).eq("experience_version_id", versionId).maybeSingle(),
    db.from("section_columns").select("*").eq("section_layout_id", layout.data.id).eq("section_id", sectionId).order("sort_order"),
  ]);
  if (lesson.error || columns.error || !lesson.data || lesson.data.module_id !== section.data.module_id) throw new Error("The Section does not belong to the expected Lesson and Module.");
  return { admin, db, section: section.data, lesson: lesson.data, layout: layout.data, columns: columns.data ?? [] };
}

async function uniqueBlockKey(db: Db, sectionId: string, requested: string) {
  const base = slug(requested);
  for (let index = 1; index < 1000; index += 1) {
    const candidate = index === 1 ? base : `${base}-${index}`;
    const result = await db.from("content_blocks").select("id").eq("section_id", sectionId).eq("block_key", candidate).maybeSingle();
    if (result.error) throw new Error(`Unable to verify the Block key: ${result.error.message}`);
    if (!result.data) return candidate;
  }
  throw new Error("Unable to generate a stable Block key.");
}

async function columnBlocks(db: Db, columnId: string) {
  const result = await db.from("content_blocks").select("id,lesson_id,sort_order").eq("column_id", columnId).order("sort_order").order("created_at");
  if (result.error) throw new Error(`Unable to load the Column Blocks: ${result.error.message}`);
  return result.data ?? [];
}

async function nextLessonOrder(db: Db, lessonId: string) {
  const result = await db.from("content_blocks").select("sort_order").eq("lesson_id", lessonId).order("sort_order", { ascending: false }).limit(1);
  if (result.error) throw new Error(`Unable to load the Lesson Block order: ${result.error.message}`);
  return (result.data?.[0]?.sort_order ?? -1) + 1;
}

async function applyOrder(db: Db, columnId: string, ids: readonly string[]) {
  const current = await columnBlocks(db, columnId);
  if (current.length !== ids.length || new Set(ids).size !== ids.length || ids.some((id) => !current.some((block) => block.id === id))) {
    throw new Error("The Column Blocks changed while their order was being saved. Reload and try again.");
  }
  if (!ids.length || ids.every((id, index) => id === current[index].id)) return;
  const lessonId = current[0].lesson_id;
  if (current.some((block) => block.lesson_id !== lessonId)) throw new Error("Column Blocks span multiple Lessons.");
  // Keep the Column's existing Lesson-unique order slots. Never compact to 0..N,
  // since another Page/Column in this Lesson may already own those values.
  const slots = current.map((block) => block.sort_order).sort((a, b) => a - b);
  const temporaryOffset = await nextLessonOrder(db, lessonId);
  for (const [index, id] of ids.entries()) {
    const result = await db.from("content_blocks").update({ sort_order: temporaryOffset + index }).eq("id", id).eq("column_id", columnId).eq("lesson_id", lessonId);
    if (result.error) throw new Error(`Unable to prepare Block ordering: ${result.error.message}`);
  }
  for (const [index, id] of ids.entries()) {
    const result = await db.from("content_blocks").update({ sort_order: slots[index] }).eq("id", id).eq("column_id", columnId).eq("lesson_id", lessonId);
    if (result.error) throw new Error(`Unable to save Block ordering: ${result.error.message}`);
  }
}

async function blockInContext(db: Db, blockId: string, sectionId: string) {
  const result = await db.from("content_blocks").select("*").eq("id", blockId).eq("section_id", sectionId).maybeSingle();
  if (result.error || !result.data || !result.data.column_id) throw new Error("Block not found in this Section layout.");
  return result.data;
}

export async function createBlock(experienceId: string, versionId: string, sectionId: string, columnId: string, blockType: string, position?: number): Promise<string> {
  const { admin, db, section, lesson, columns } = await context(experienceId, versionId, sectionId);
  const column = columns.find((candidate) => candidate.id === columnId);
  const definition = getBlockDefinition(blockType);
  if (!column || !definition || definition.availability !== "available") throw new Error("That Block type or target Column is unavailable.");
  const parsed = definition.validateConfiguration(definition.defaultConfiguration());
  if (!parsed.ok) throw new Error(parsed.errors.join(" "));
  const blockKey = await uniqueBlockKey(db, sectionId, definition.blockType);
  const placement = { lesson_id: lesson.id, section_id: sectionId, column_id: columnId, block_key: blockKey };
  const validPlacement = validateBuilderBlockPlacement({ block: placement, section, lesson, columns });
  if (!validPlacement.ok) throw new Error(validPlacement.errors.join(" "));
  const payload: TablesInsert<"content_blocks"> = { ...placement, block_type: definition.blockType, sort_order: await nextLessonOrder(db, lesson.id), content: parsed.value as Json, settings: {}, requirement_level: "optional", status: "active", visibility: "visible", completion_rule: definition.defaultCompletionRule, custom_renderer_key: null, metadata: {} };
  let result = await db.from("content_blocks").insert(payload).select("id").single();
  // Concurrent Admin requests can race between MAX and INSERT. Retry only the
  // Lesson-order constraint, using a fresh Lesson-wide maximum each time.
  for (let attempt = 0; attempt < 2 && result.error?.code === "23505" && result.error.message.includes("content_blocks_lesson_order_key"); attempt += 1) {
    payload.sort_order = await nextLessonOrder(db, lesson.id);
    result = await db.from("content_blocks").insert(payload).select("id").single();
  }
  if (result.error) {
    console.error("Unable to create Content Block", { blockType, code: result.error.code, message: result.error.message, details: result.error.details, hint: result.error.hint });
    if (result.error.code === "23514" && result.error.message.includes("content_blocks_block_type_check")) {
      throw new Error(`${definition.label} is not enabled in this environment yet. Apply the pending native-media Block type migration.`);
    }
    throw new Error(`Unable to create ${definition.label}. Please try again or ask an administrator to review the server log.`);
  }
  if (definition.response) {
    const responseResult = await db.from("response_definitions").insert(responsePayload(definition, result.data.id, lesson.id, versionId, blockKey.replace(/-/g, "_"), parsed.value as Json));
    if (responseResult.error) {
      await db.from("content_blocks").delete().eq("id", result.data.id);
      throw new Error(`Unable to create the linked response definition: ${responseResult.error.message}`);
    }
  }
  if (Number.isInteger(position)) {
    try {
      const ordered = (await columnBlocks(db, columnId)).map((item) => item.id).filter((id) => id !== result.data.id);
      ordered.splice(Math.min(Math.max(position!, 0), ordered.length), 0, result.data.id);
      await applyOrder(db, columnId, ordered);
    } catch (error) {
      if (definition.response) await db.from("response_definitions").delete().eq("block_id", result.data.id);
      await db.from("content_blocks").delete().eq("id", result.data.id);
      throw error;
    }
  }
  await audit(admin, "section.block.created", "content_block", result.data.id, { experienceId, versionId, sectionId, columnId, blockType, blockKey, position: Number.isInteger(position) ? position : null });
  return result.data.id;
}

export async function updateBlock(experienceId: string, versionId: string, sectionId: string, blockId: string, form: FormData) {
  const { admin, db, columns } = await context(experienceId, versionId, sectionId);
  const block = await blockInContext(db, blockId, sectionId);
  if (!columns.some((column) => column.id === block.column_id)) throw new Error("The Block Column does not belong to this Section layout.");
  const definition = getBlockDefinition(block.block_type);
  if (!definition) throw new Error("This unavailable Block type is preserved but cannot be edited.");
  const parsed = parseBlockConfiguration(block.block_type, formConfiguration(block.block_type, form));
  if (!parsed.ok) throw new Error(parsed.errors.join(" "));
  const requirement = String(form.get("requirement_level") ?? "optional");
  const visibility = String(form.get("visibility") ?? "visible");
  if (!REQUIREMENTS.has(requirement) || !VISIBILITIES.has(visibility)) throw new Error("Invalid Block requirement or visibility.");
  if (definition.response && ["single_select", "multi_select"].includes(definition.response.responseKind)) {
    const before = definition.validateConfiguration(block.content);
    const oldOptions = before.ok && Array.isArray(before.value.options) ? before.value.options as Array<{ key?: unknown }> : [];
    const newOptions = Array.isArray(parsed.value.options) ? parsed.value.options as Array<{ key?: unknown }> : [];
    const keysChanged = oldOptions.map((option) => option.key).sort().join("\u0000") !== newOptions.map((option) => option.key).sort().join("\u0000");
    if (keysChanged) {
      const linked = await db.from("response_definitions").select("id").eq("block_id", blockId).eq("experience_version_id", versionId).maybeSingle();
      if (linked.error || !linked.data) throw new Error("Unable to verify the linked response definition.");
      const history = await db.from("participant_responses").select("id", { count: "exact", head: true }).eq("response_definition_id", linked.data.id);
      if (history.error) throw new Error(`Unable to verify option history: ${history.error.message}`);
      if (history.count) throw new Error("Option keys cannot be added, removed, or reordered after participant responses exist. Create a new Version instead.");
    }
  }
  const result = await db.from("content_blocks").update({ content: parsed.value as Json, settings: {}, requirement_level: requirement, visibility, completion_rule: definition.defaultCompletionRule }).eq("id", blockId).eq("section_id", sectionId).eq("column_id", block.column_id!);
  if (result.error) throw new Error(`Unable to update Block: ${result.error.message}`);
  if (MEDIA_TYPES.has(block.block_type)) {
    try { await linkExternalResource(db, blockId, block.block_type, parsed.value, admin.id); }
    catch (error) {
      await db.from("content_blocks").update({ content: block.content, settings: block.settings, requirement_level: block.requirement_level, visibility: block.visibility, completion_rule: block.completion_rule }).eq("id", blockId);
      throw error;
    }
  }
  if (definition.response) {
    const prompt = String(form.get("prompt") ?? "").trim();
    if (!prompt) throw new Error("Write a question or prompt before saving this response Block.");
    const responseResult = await db.from("response_definitions").update({ label: String(form.get("prompt") ?? "").trim() || definition.label, instructions: String(form.get("instructions") ?? "").trim() || null, is_required: requirement === "required", configuration: parsed.value as Json }).eq("block_id", blockId).eq("lesson_id", block.lesson_id).eq("experience_version_id", versionId).select("id").maybeSingle();
    if (responseResult.error || !responseResult.data) throw new Error(`Unable to update the linked response definition${responseResult.error ? `: ${responseResult.error.message}` : "."}`);
  }
  await audit(admin, "section.block.updated", "content_block", blockId, { experienceId, versionId, sectionId, columnId: block.column_id, blockType: block.block_type });
}

export async function updateBlockSettings(experienceId: string, versionId: string, sectionId: string, blockId: string, form: FormData) {
  const { admin, db, columns } = await context(experienceId, versionId, sectionId);
  const block = await blockInContext(db, blockId, sectionId);
  if (!columns.some((column) => column.id === block.column_id)) throw new Error("The Block Column does not belong to this Section layout.");
  const requirement = String(form.get("requirement_level") ?? "optional");
  const visibility = String(form.get("visibility") ?? "visible");
  if (!REQUIREMENTS.has(requirement) || !VISIBILITIES.has(visibility)) throw new Error("Invalid Block requirement or visibility.");
  const updates: { requirement_level: string; visibility: string; content?: Json } = { requirement_level: requirement, visibility };
  if (block.block_type === "heading") {
    const current = block.content && typeof block.content === "object" && !Array.isArray(block.content) ? block.content : {};
    const merged = {
      ...current,
      alignment: String(form.get("alignment") ?? current.alignment ?? "left"),
      eyebrow: String(form.get("eyebrow") ?? current.eyebrow ?? ""),
    };
    const parsed = parseBlockConfiguration("heading", merged);
    if (!parsed.ok) throw new Error(parsed.errors.join(" "));
    updates.content = parsed.value as Json;
  }
  const result = await db.from("content_blocks").update(updates).eq("id", blockId).eq("section_id", sectionId).eq("column_id", block.column_id!);
  if (result.error) throw new Error(`Unable to update Block settings: ${result.error.message}`);
  await audit(admin, "section.block.settings.updated", "content_block", blockId, { experienceId, versionId, sectionId, columnId: block.column_id, requirement, visibility });
}

export async function setBlockAsset(experienceId: string, versionId: string, sectionId: string, blockId: string, form: FormData) {
  const { admin, db } = await context(experienceId, versionId, sectionId);
  const block = await blockInContext(db, blockId, sectionId);
  if (!new Set(["image", "pdf_reader", "document", "download"]).has(block.block_type)) throw new Error("Native uploads are available for Image, PDF Reader, Document, and Download Blocks.");
  const operation = String(form.get("asset_operation") ?? "select");
  let resourceId = String(form.get("resource_id") ?? "");
  if (operation === "upload") {
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("Choose a file to upload.");
    if (block.block_type === "pdf_reader" && file.type !== "application/pdf") throw new Error("PDF Reader Blocks require a PDF file.");
    const asset = await uploadCourseAsset(db, file, experienceId, admin.id, String(form.get("asset_title") ?? ""));
    resourceId = asset.id;
  }
  if (operation === "remove") {
    const removed = await db.from("content_block_resources").delete().eq("content_block_id", blockId);
    if (removed.error) throw new Error(`Unable to remove the asset from this Block: ${removed.error.message}`);
    await audit(admin, "section.block.asset.unlinked", "content_block", blockId, { experienceId, versionId, sectionId });
    return;
  }
  const resource = await db.from("resources").select("id,resource_type,status,storage_path,mime_type").eq("id", resourceId).eq("status", "active").not("storage_path", "is", null).maybeSingle();
  if (resource.error || !resource.data) throw new Error("Choose an available uploaded asset.");
  if (block.block_type === "image" && resource.data.resource_type !== "image") throw new Error("Image Blocks require an uploaded image.");
  if (block.block_type === "pdf_reader" && (resource.data.resource_type !== "pdf" || resource.data.mime_type !== "application/pdf")) throw new Error("PDF Reader Blocks require an uploaded PDF.");
  if (!["image", "pdf_reader"].includes(block.block_type) && !["pdf", "download", "worksheet", "guide"].includes(resource.data.resource_type)) throw new Error("Choose a PDF or document asset.");
  const existing = await db.from("content_block_resources").select("resource_id").eq("content_block_id", blockId);
  if (existing.error) throw new Error(`Unable to inspect current asset links: ${existing.error.message}`);
  if (!(existing.data ?? []).some((link) => link.resource_id === resourceId)) {
    const inserted = await db.from("content_block_resources").insert({ content_block_id: blockId, resource_id: resourceId, sort_order: 0 });
    if (inserted.error) throw new Error(`Unable to attach the asset: ${inserted.error.message}`);
  }
  const stale = (existing.data ?? []).map((link) => link.resource_id).filter((id) => id !== resourceId);
  if (stale.length) {
    const removed = await db.from("content_block_resources").delete().eq("content_block_id", blockId).in("resource_id", stale);
    if (removed.error) throw new Error(`Unable to replace the Block asset: ${removed.error.message}`);
  }
  await audit(admin, "section.block.asset.linked", "content_block", blockId, { experienceId, versionId, sectionId, resourceId });
}

export async function deleteBlock(experienceId: string, versionId: string, sectionId: string, blockId: string, confirmed: boolean) {
  if (!confirmed) throw new Error("Confirm Block deletion first.");
  const { admin, db } = await context(experienceId, versionId, sectionId);
  const block = await blockInContext(db, blockId, sectionId);
  const responses = await db.from("response_definitions").select("*").eq("block_id", blockId);
  if (responses.error) throw new Error(`Unable to verify Block response dependencies: ${responses.error.message}`);
  const responseIds = (responses.data ?? []).map((item) => item.id);
  if (responseIds.length) {
    const participantResponses = await db.from("participant_responses").select("id", { count: "exact", head: true }).in("response_definition_id", responseIds);
    if (participantResponses.error) throw new Error(`Unable to verify participant response history: ${participantResponses.error.message}`);
    if (participantResponses.count) throw new Error("This Block has participant response history and cannot be deleted.");
    const definitionDelete = await db.from("response_definitions").delete().in("id", responseIds);
    if (definitionDelete.error) throw new Error(`Unable to delete the linked response definition: ${definitionDelete.error.message}`);
  }
  const resourceLinks = await db.from("content_block_resources").delete().eq("content_block_id", blockId);
  if (resourceLinks.error) throw new Error(`Unable to unlink Block Resources before deletion: ${resourceLinks.error.message}`);
  const result = await db.from("content_blocks").delete().eq("id", blockId).eq("section_id", sectionId).eq("column_id", block.column_id!);
  if (result.error) {
    if (responses.data?.length) await db.from("response_definitions").insert(responses.data);
    throw new Error(`Unable to delete Block: ${result.error.message}`);
  }
  await applyOrder(db, block.column_id!, (await columnBlocks(db, block.column_id!)).map((item) => item.id));
  await audit(admin, "section.block.deleted", "content_block", blockId, { experienceId, versionId, sectionId, columnId: block.column_id, blockType: block.block_type });
}

export async function duplicateBlock(experienceId: string, versionId: string, sectionId: string, blockId: string) {
  const { admin, db } = await context(experienceId, versionId, sectionId);
  const block = await blockInContext(db, blockId, sectionId);
  const definition = getBlockDefinition(block.block_type);
  if (!definition?.duplicable) throw new Error("This Block type cannot be duplicated.");
  const parsed = definition.validateConfiguration(block.content);
  if (!parsed.ok) throw new Error(`The source Block configuration is invalid: ${parsed.errors.join(" ")}`);
  const blockKey = await uniqueBlockKey(db, sectionId, block.block_key || block.block_type);
  const siblings = await columnBlocks(db, block.column_id!);
  const payload: TablesInsert<"content_blocks"> = { lesson_id: block.lesson_id, section_id: sectionId, column_id: block.column_id, block_key: blockKey, block_type: block.block_type, sort_order: await nextLessonOrder(db, block.lesson_id), content: parsed.value as Json, settings: block.settings, requirement_level: block.requirement_level, status: block.status, visibility: block.visibility, completion_rule: block.completion_rule, custom_renderer_key: block.custom_renderer_key, metadata: block.metadata };
  let result = await db.from("content_blocks").insert(payload).select("id").single();
  for (let attempt = 0; attempt < 2 && result.error?.code === "23505" && result.error.message.includes("content_blocks_lesson_order_key"); attempt += 1) {
    payload.sort_order = await nextLessonOrder(db, block.lesson_id);
    result = await db.from("content_blocks").insert(payload).select("id").single();
  }
  if (result.error) throw new Error(`Unable to duplicate Block: ${result.error.message}`);
  if (MEDIA_TYPES.has(block.block_type) && parsed.value.url) {
    try { await linkExternalResource(db, result.data.id, block.block_type, parsed.value, admin.id); }
    catch (error) {
      await db.from("content_block_resources").delete().eq("content_block_id", result.data.id);
      await db.from("content_blocks").delete().eq("id", result.data.id);
      throw error;
    }
  }
  if (definition.response) {
    const source = await db.from("response_definitions").select("*").eq("block_id", blockId).eq("experience_version_id", versionId).maybeSingle();
    if (source.error || !source.data) {
      await db.from("content_blocks").delete().eq("id", result.data.id);
      throw new Error("Unable to duplicate the linked response definition.");
    }
    const responseResult = await db.from("response_definitions").insert(responsePayload(definition, result.data.id, block.lesson_id, versionId, blockKey.replace(/-/g, "_"), source.data.configuration, source.data.label, source.data.instructions, source.data.is_required));
    if (responseResult.error) {
      await db.from("content_blocks").delete().eq("id", result.data.id);
      throw new Error(`Unable to duplicate the linked response definition: ${responseResult.error.message}`);
    }
  }
  const sourceIndex = siblings.findIndex((item) => item.id === blockId);
  const ordered = siblings.map((item) => item.id);
  ordered.splice(sourceIndex + 1, 0, result.data.id);
  await applyOrder(db, block.column_id!, ordered);
  await audit(admin, "section.block.duplicated", "content_block", result.data.id, { experienceId, versionId, sectionId, sourceBlockId: blockId, columnId: block.column_id, blockKey });
}

export async function reorderBlock(experienceId: string, versionId: string, sectionId: string, blockId: string, direction: Direction) {
  const { admin, db } = await context(experienceId, versionId, sectionId);
  const block = await blockInContext(db, blockId, sectionId);
  const siblings = await columnBlocks(db, block.column_id!);
  const index = siblings.findIndex((item) => item.id === blockId);
  const target = index + (direction === "up" ? -1 : 1);
  if (index < 0 || target < 0 || target >= siblings.length) return;
  const ordered = siblings.map((item) => item.id);
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  await applyOrder(db, block.column_id!, ordered);
  await audit(admin, "section.block.reordered", "content_block", blockId, { experienceId, versionId, sectionId, columnId: block.column_id, direction });
}

export async function reorderBlockToPosition(experienceId: string, versionId: string, sectionId: string, blockId: string, columnId: string, position: number) {
  const { admin, db, columns } = await context(experienceId, versionId, sectionId);
  if (!columns.some((column) => column.id === columnId)) throw new Error("The target Column does not belong to this Section.");
  const block = await blockInContext(db, blockId, sectionId);
  if (block.column_id !== columnId) throw new Error("Use Move to send Content to a different Column.");
  const siblings = await columnBlocks(db, columnId);
  const ordered = siblings.map((item) => item.id).filter((id) => id !== blockId);
  ordered.splice(Math.min(Math.max(position, 0), ordered.length), 0, blockId);
  await applyOrder(db, columnId, ordered);
  await audit(admin, "section.block.reordered", "content_block", blockId, { experienceId, versionId, sectionId, columnId, position });
}

export async function moveBlock(experienceId: string, versionId: string, sectionId: string, blockId: string, targetColumnId: string) {
  const { admin, db, columns } = await context(experienceId, versionId, sectionId);
  const block = await blockInContext(db, blockId, sectionId);
  if (!columns.some((column) => column.id === targetColumnId)) throw new Error("The target Column does not belong to this Section.");
  if (block.column_id === targetColumnId) return;
  const sourceColumnId = block.column_id!;
  let result = await db.from("content_blocks").update({ column_id: targetColumnId, sort_order: await nextLessonOrder(db, block.lesson_id) }).eq("id", blockId).eq("section_id", sectionId).eq("column_id", sourceColumnId);
  for (let attempt = 0; attempt < 2 && result.error?.code === "23505" && result.error.message.includes("content_blocks_lesson_order_key"); attempt += 1) {
    result = await db.from("content_blocks").update({ column_id: targetColumnId, sort_order: await nextLessonOrder(db, block.lesson_id) }).eq("id", blockId).eq("section_id", sectionId).eq("column_id", sourceColumnId);
  }
  if (result.error) throw new Error(`Unable to move Block: ${result.error.message}`);
  await applyOrder(db, sourceColumnId, (await columnBlocks(db, sourceColumnId)).map((item) => item.id));
  await applyOrder(db, targetColumnId, (await columnBlocks(db, targetColumnId)).map((item) => item.id));
  await audit(admin, "section.block.moved", "content_block", blockId, { experienceId, versionId, sectionId, sourceColumnId, targetColumnId });
}
