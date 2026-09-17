#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  COURSE_PLAN, DOCUMENT_SOURCE_IDS, EXTERNAL_FORM_HOSTS, IMPORT_KEY,
  KEEP_INLINE_IMAGE_SOURCE_IDS, NATIVE_RESPONSES, NATIVE_SPECIAL_RESPONSES,
  SLIDE_SOURCE_IDS, SOURCE_COURSE_ID, TARGET_EXPERIENCE_ID, TARGET_SLUG,
  UNRESOLVED_SHORTCODES,
} from "./hub-leader-cohort-1753-plan.mjs";

const MAX_NATIVE_BYTES = 25 * 1024 * 1024;
const BUCKET = "purposeos-assets";
const args = process.argv.slice(2);
const valueArg = (name) => args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
const sourcePath = valueArg("--source");
const apply = args.includes("--apply");
const checkMedia = args.includes("--check-media");
const asJson = args.includes("--json");

if (!sourcePath) throw new Error("Pass --source=/absolute/path/to/1753.json-or-zip");
if (apply && (valueArg("--confirm-source-course") !== String(SOURCE_COURSE_ID) || valueArg("--confirm-target") !== TARGET_EXPERIENCE_ID)) {
  throw new Error(`Live import requires --confirm-source-course=${SOURCE_COURSE_ID} and --confirm-target=${TARGET_EXPERIENCE_ID}.`);
}

function loadExport(path) {
  const raw = extname(path).toLowerCase() === ".zip"
    ? execFileSync("unzip", ["-p", path, "1753 - Wayfinders Hub Leader Cohort/1753.json"], { encoding: "utf8", maxBuffer: 5 * 1024 * 1024 })
    : readFileSync(path, "utf8");
  const parsed = JSON.parse(raw);
  const course = parsed?.data?.[0]?.data?.course;
  if (!course || Number(course.ID) !== SOURCE_COURSE_ID) throw new Error(`The source is not Tutor course ${SOURCE_COURSE_ID}.`);
  return { envelope: parsed, course };
}

function decode(value) {
  const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return value.replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&#x([0-9a-f]+);/gi, (_, number) => String.fromCodePoint(parseInt(number, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => entities[name.toLowerCase()] ?? match);
}

function htmlToMarkdown(html) {
  return decode(String(html || ""))
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/\[formidable\s+[^\]]+\]/gi, "")
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => `[${label.replace(/<[^>]+>/g, "").trim() || href}](${href})`)
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**")
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*")
    .replace(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/gi, "\n# $1\n")
    .replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, "\n## $1\n")
    .replace(/<h[456]\b[^>]*>([\s\S]*?)<\/h[456]>/gi, "\n### $1\n")
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1")
    .replace(/<(br|hr)\b[^>]*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|blockquote|ul|ol)>/gi, "\n")
    .replace(/<(p|div|blockquote|ul|ol)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function allUrls(html) {
  const urls = [];
  for (const match of String(html || "").matchAll(/(?:href|src)=["'](https:\/\/[^"']+)["']/gi)) urls.push(decode(match[1]));
  return [...new Set(urls)];
}

function host(url) { try { return new URL(url).hostname.toLowerCase(); } catch { return ""; } }
function isFormUrl(url) { return EXTERNAL_FORM_HOSTS.some((candidate) => host(url).endsWith(candidate)); }
function isImageUrl(url) { return /\.(?:png|jpe?g|webp|gif)(?:\?.*)?$/i.test(url); }
function isPdfUrl(url) { return /\.pdf(?:\?.*)?$/i.test(url); }
function filename(url) { try { return decodeURIComponent(basename(new URL(url).pathname)); } catch { return "source-file"; } }
function titleFromFilename(url) { return filename(url).replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim(); }
function slug(value, fallback = "item") { return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72) || fallback; }
function uuid(scope) {
  const hex = createHash("sha256").update(`${IMPORT_KEY}:${scope}`).digest("hex").slice(0, 32).split("");
  hex[12] = "4"; hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

function tutorVideo(item) {
  const video = item.meta?._video?.[0] || {};
  return video.source_youtube || video.source_vimeo || video.source_external_url || "";
}

function sourceIndex(course) {
  const topics = new Map(course.contents.map((topic) => [Number(topic.ID), topic]));
  const items = new Map(course.contents.flatMap((topic) => topic.children.map((item) => [Number(item.ID), { ...item, sourceTopicId: Number(topic.ID) }])));
  return { topics, items };
}

function mediaForItem(item) {
  const attachments = (item.attachment_links || []).filter((url) => isPdfUrl(url) || isImageUrl(url));
  const inlineImages = KEEP_INLINE_IMAGE_SOURCE_IDS.has(Number(item.ID)) ? allUrls(item.post_content).filter(isImageUrl) : [];
  const thumbnail = typeof item.thumbnail_url === "string" ? [item.thumbnail_url] : [];
  return [...new Set([...attachments, ...inlineImages, ...thumbnail])];
}

function externalForms(item) { return allUrls(item.post_content).filter(isFormUrl); }

function responseBlocks(item) {
  const blocks = [];
  for (const [index, prompt] of (NATIVE_RESPONSES[item.ID] || []).entries()) {
    blocks.push({ blockType: "reflection", title: prompt, content: { placeholder: "Write your reflection…", maxLength: 8000 }, response: { prompt }, sourceId: item.ID, suffix: `response-${index + 1}` });
  }
  const special = NATIVE_SPECIAL_RESPONSES[item.ID];
  if (special) {
    const content = special.type === "checklist"
      ? { options: special.options.map((label, index) => ({ key: slug(label), label, description: "", sortOrder: index })), minSelections: special.minSelections, maxSelections: special.maxSelections }
      : { placeholder: "Write your response…", maxLength: special.type === "reflection" ? 8000 : 500 };
    blocks.push({ blockType: special.type, title: special.prompt, content, response: { prompt: special.prompt }, sourceId: item.ID, suffix: "native-response" });
  }
  return blocks;
}

function buildProposal(course) {
  const source = sourceIndex(course);
  const plannedIds = COURSE_PLAN.flatMap((module) => module.lessons.flatMap((entry) => entry.pages.flatMap((candidate) => candidate.sourceIds)));
  const missing = plannedIds.filter((id) => !source.items.has(id));
  const omitted = [...source.items.keys()].filter((id) => !plannedIds.includes(id));
  if (missing.length || omitted.length || new Set(plannedIds).size !== plannedIds.length) throw new Error(`Plan/source mismatch. Missing: ${missing.join(",") || "none"}; omitted: ${omitted.join(",") || "none"}.`);

  let globalBlockOrder = 0;
  const resources = new Map();
  const modules = COURSE_PLAN.map((module, moduleOrder) => ({
    ...module,
    id: uuid(`module:${module.key}`),
    sortOrder: moduleOrder,
    lessons: module.lessons.map((entry, lessonOrder) => {
      let lessonBlockOrder = 0;
      const lessonId = uuid(`lesson:${module.key}:${entry.key}`);
      return {
        ...entry, id: lessonId, sortOrder: lessonOrder,
        pages: entry.pages.map((candidate, pageOrder) => {
          const sectionId = uuid(`page:${module.key}:${entry.key}:${candidate.key}`);
          const layoutId = uuid(`layout:${sectionId}`);
          const columnId = uuid(`column:${sectionId}:main`);
          const blocks = [];
          for (const sourceId of candidate.sourceIds) {
            const item = source.items.get(sourceId);
            const cleaned = htmlToMarkdown(item.post_content);
            if (cleaned.length > 12000) throw new Error(`Cleaned source post ${sourceId} exceeds the Rich Text Block limit; split it before import.`);
            if (cleaned) blocks.push({ blockType: "rich_text", title: item.post_title, content: { title: item.post_title, text: cleaned }, sourceId, suffix: "content" });
            const video = tutorVideo(item);
            if (video) blocks.push({ blockType: "video", title: item.post_title, content: { title: item.post_title, description: "", url: video, caption: "", alt: "", linkLabel: "Watch video" }, sourceId, suffix: "video", resourceUrl: video });
            for (const url of mediaForItem(item)) {
              const isPdf = isPdfUrl(url);
              const blockType = isPdf ? (DOCUMENT_SOURCE_IDS.has(sourceId) ? "document" : "pdf_reader") : "image";
              const mediaTitle = titleFromFilename(url) || item.post_title;
              const content = blockType === "pdf_reader"
                ? { title: mediaTitle, description: "", readerMode: SLIDE_SOURCE_IDS.has(sourceId) ? "slides" : "reader" }
                : { title: mediaTitle, description: "", url: "", caption: "", alt: blockType === "image" ? item.post_title : "", linkLabel: blockType === "document" ? "Open or download file" : "" };
              blocks.push({ blockType, title: mediaTitle, content, sourceId, suffix: `media-${createHash("sha1").update(url).digest("hex").slice(0, 8)}`, resourceUrl: url });
              resources.set(url, { url, title: mediaTitle, kind: blockType === "image" ? "image" : "pdf", sourceIds: [...new Set([...(resources.get(url)?.sourceIds || []), sourceId])] });
            }
            for (const url of externalForms(item)) {
              const formTitle = `${item.post_title} form`;
              blocks.push({ blockType: "external_link", title: formTitle, content: { title: formTitle, description: "Preserved external form from the TutorLMS course.", url, caption: "", alt: "", linkLabel: "Open form" }, sourceId, suffix: `form-${createHash("sha1").update(url).digest("hex").slice(0, 8)}`, resourceUrl: url });
            }
            blocks.push(...responseBlocks(item));
            if (UNRESOLVED_SHORTCODES[sourceId]) blocks.push({ blockType: "callout", title: "Needs native form rebuild", content: { title: "NEEDS NATIVE FORM REBUILD", body: UNRESOLVED_SHORTCODES[sourceId], treatment: "warning" }, sourceId, suffix: "manual-rebuild" });
          }
          const hydrated = blocks.map((block, index) => ({ ...block, id: uuid(`block:${sectionId}:${block.sourceId}:${block.suffix}`), blockKey: slug(`${block.suffix}-${block.sourceId}-${index + 1}`, `block-${index + 1}`), sortOrder: lessonBlockOrder++, pageOrder: index, globalOrder: globalBlockOrder++ }));
          return { ...candidate, id: sectionId, layoutId, columnId, sortOrder: pageOrder, blocks: hydrated };
        }),
      };
    }),
  }));
  return { modules, resources: [...resources.values()], source };
}

function countProposal(proposal) {
  const lessons = proposal.modules.flatMap((module) => module.lessons);
  const pages = lessons.flatMap((entry) => entry.pages);
  const blocks = pages.flatMap((candidate) => candidate.blocks);
  const byType = Object.fromEntries([...new Set(blocks.map((block) => block.blockType))].sort().map((type) => [type, blocks.filter((block) => block.blockType === type).length]));
  return { weeks: proposal.modules.length, lessons: lessons.length, pages: pages.length, blocks: blocks.length, byType, uniqueNativeMedia: proposal.resources.length, unresolvedShortcodes: Object.keys(UNRESOLVED_SHORTCODES).length };
}

async function probeMedia(resources) {
  return Promise.all(resources.map(async (resource) => {
    try {
      const response = await fetch(resource.url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(15000) });
      const bytes = Number(response.headers.get("content-length")) || null;
      return { ...resource, ok: response.ok, status: response.status, bytes, mime: response.headers.get("content-type")?.split(";")[0] || null, nativeEligible: response.ok && (!bytes || bytes <= MAX_NATIVE_BYTES) };
    } catch (error) { return { ...resource, ok: false, status: null, bytes: null, mime: null, nativeEligible: false, error: error instanceof Error ? error.message : String(error) }; }
  }));
}

function dbClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) throw new Error("Load .env.local so the target can be inspected.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

async function targetState(db) {
  const experience = await db.from("experiences").select("*").eq("id", TARGET_EXPERIENCE_ID).eq("slug", TARGET_SLUG).maybeSingle();
  if (experience.error || !experience.data) throw new Error(`Target Experience was not found: ${experience.error?.message || TARGET_EXPERIENCE_ID}`);
  const versions = await db.from("experience_versions").select("*").eq("experience_id", TARGET_EXPERIENCE_ID).order("created_at");
  if (versions.error) throw new Error(versions.error.message);
  const draft = versions.data.find((version) => version.status === "draft") || null;
  const published = versions.data.find((version) => version.status === "published") || null;
  const versionIds = versions.data.map((version) => version.id);
  const modules = versionIds.length ? await db.from("experience_modules").select("*").in("experience_version_id", versionIds).order("sort_order") : { data: [], error: null };
  if (modules.error) throw new Error(modules.error.message);
  const alreadyImported = (modules.data || []).some((module) => module.metadata?.import?.key === IMPORT_KEY || Number(module.metadata?.import?.source_course_id) === SOURCE_COURSE_ID);
  return { experience: experience.data, versions: versions.data, draft, published, modules: modules.data || [], alreadyImported };
}

function hierarchy(proposal) {
  return proposal.modules.map((module) => [`${module.title}`, ...module.lessons.flatMap((entry) => [`  ${entry.title}`, ...entry.pages.map((candidate) => `    ${candidate.title} [${candidate.sourceIds.join(", ")}]`)])]).flat().join("\n");
}

async function createResource(db, resource, experienceId) {
  const id = uuid(`resource:${resource.url}`);
  const existing = await db.from("resources").select("id").eq("id", id).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return id;
  let response;
  try { response = await fetch(resource.url, { redirect: "follow", signal: AbortSignal.timeout(30000) }); } catch { response = null; }
  const announced = Number(response?.headers.get("content-length")) || null;
  const mime = response?.headers.get("content-type")?.split(";")[0] || (resource.kind === "pdf" ? "application/pdf" : "image/jpeg");
  let buffer = null;
  if (response?.ok && (!announced || announced <= MAX_NATIVE_BYTES)) {
    const candidate = Buffer.from(await response.arrayBuffer());
    if (candidate.byteLength <= MAX_NATIVE_BYTES) buffer = candidate;
  }
  const originalFilename = filename(resource.url).slice(0, 255) || `${id}.${resource.kind === "pdf" ? "pdf" : "jpg"}`;
  const objectPath = `courses/${experienceId}/${id}/asset${extname(originalFilename).toLowerCase()}`;
  const metadata = { import: { key: IMPORT_KEY, source_course_id: SOURCE_COURSE_ID, source_url: resource.url, source_post_ids: resource.sourceIds }, manual_review: buffer ? null : "Remote media could not be copied safely; source URL retained." };
  if (buffer) {
    const uploaded = await db.storage.from(BUCKET).upload(objectPath, buffer, { contentType: mime, upsert: false, cacheControl: "3600" });
    if (uploaded.error) throw new Error(`Upload failed for ${resource.url}: ${uploaded.error.message}`);
  }
  const created = await db.from("resources").insert({ id, title: resource.title.slice(0, 200), description: null, resource_type: resource.kind, status: "active", external_url: buffer ? null : resource.url, storage_bucket: buffer ? BUCKET : null, storage_path: buffer ? objectPath : null, original_filename: buffer ? originalFilename : null, mime_type: buffer ? mime : null, file_size_bytes: buffer ? buffer.byteLength : null, metadata, created_by: null }).select("id").single();
  if (created.error) { if (buffer) await db.storage.from(BUCKET).remove([objectPath]); throw new Error(created.error.message); }
  return created.data.id;
}

async function performImport(db, state, proposal) {
  if (state.alreadyImported) throw new Error(`Tutor course ${SOURCE_COURSE_ID} has already been imported into this Experience. Stopping before mutation.`);
  if (state.versions.some((version) => version.status !== "draft")) throw new Error("A non-Draft Version exists. This first-course importer will not mutate or clone it; review the target before proceeding.");
  if (state.draft && state.modules.length) throw new Error("The existing Draft is not empty. This controlled first-course importer will not overwrite it.");

  let version = state.draft;
  if (!version) {
    const result = await db.from("experience_versions").insert({ id: uuid("version"), experience_id: TARGET_EXPERIENCE_ID, version_label: "TutorLMS 1753 import draft", status: "draft", title: "Hub Leader Cohort", description: "Imported from TutorLMS course 1753 for review.", published_at: null, created_by: null, based_on_version_id: null, published_by: null, release_type: "major", theme_id: state.experience.default_theme_id, shell_mode: "standard", course_configuration: { terminology: { group_label: "week" }, appearance: { header_treatment: "minimal", reading_width: "standard", accent_color: null, cover_resource_id: null } } }).select("*").single();
    if (result.error) throw new Error(result.error.message);
    version = result.data;
  }
  const updated = await db.from("experiences").update({ delivery_mode: "builder" }).eq("id", TARGET_EXPERIENCE_ID).is("current_published_version_id", null).select("id").maybeSingle();
  if (updated.error || !updated.data) throw new Error(updated.error?.message || "Target publication state changed before import; stopping.");

  const moduleRows = proposal.modules.map((module) => ({ id: module.id, experience_version_id: version.id, module_key: module.key, title: module.title, description: null, sort_order: module.sortOrder, is_required: true, requirement_level: "required", metadata: { import: { key: IMPORT_KEY, source_course_id: SOURCE_COURSE_ID, source_topic_id: module.sourceTopicId, imported_at: new Date().toISOString() } } }));
  const lessonRows = proposal.modules.flatMap((module) => module.lessons.map((entry) => ({ id: entry.id, module_id: module.id, experience_version_id: version.id, lesson_key: entry.key, title: entry.title, description: null, sort_order: entry.sortOrder, is_required: true, requirement_level: "required", completion_rule: "blocks_complete", metadata: { import: { key: IMPORT_KEY, source_course_id: SOURCE_COURSE_ID, source_topic_id: module.sourceTopicId } } })));
  const pageRows = proposal.modules.flatMap((module) => module.lessons.flatMap((entry) => entry.pages.map((candidate) => ({ id: candidate.id, lesson_id: entry.id, module_id: module.id, experience_version_id: version.id, section_key: candidate.key, title: candidate.title, description: null, sort_order: candidate.sortOrder, requirement_level: "required", renderer_mode: "builder", custom_renderer_key: null, completion_rule: candidate.blocks.some((block) => block.response) ? "response_submitted" : "view", settings: {}, metadata: { import: { key: IMPORT_KEY, source_course_id: SOURCE_COURSE_ID, source_post_ids: candidate.sourceIds } } }))));
  for (const [table, rows] of [["experience_modules", moduleRows], ["experience_lessons", lessonRows], ["experience_sections", pageRows]]) { const result = await db.from(table).insert(rows); if (result.error) throw new Error(`${table}: ${result.error.message}`); }
  const layouts = proposal.modules.flatMap((module) => module.lessons.flatMap((entry) => entry.pages.map((candidate) => ({ id: candidate.layoutId, section_id: candidate.id, layout_mode: "single_column", participant_resizing_enabled: false, settings: {} }))));
  const columns = proposal.modules.flatMap((module) => module.lessons.flatMap((entry) => entry.pages.map((candidate) => ({ id: candidate.columnId, section_layout_id: candidate.layoutId, section_id: candidate.id, column_key: "main", label: null, sort_order: 0, width_percent: 100, sticky: false, collapsible: false, default_collapsed: false, mobile_order: 0, mobile_behavior: "stack", settings: {} }))));
  for (const [table, rows] of [["section_layouts", layouts], ["section_columns", columns]]) { const result = await db.from(table).insert(rows); if (result.error) throw new Error(`${table}: ${result.error.message}`); }

  const resourceIds = new Map();
  for (const resource of proposal.resources) resourceIds.set(resource.url, await createResource(db, resource, TARGET_EXPERIENCE_ID));
  const allPages = proposal.modules.flatMap((module) => module.lessons.flatMap((entry) => entry.pages.map((candidate) => ({ module, lesson: entry, page: candidate }))));
  const blockRows = allPages.flatMap(({ lesson: entry, page: candidate }) => candidate.blocks.map((block) => ({ id: block.id, lesson_id: entry.id, section_id: candidate.id, column_id: candidate.columnId, block_key: block.blockKey, block_type: block.blockType, sort_order: block.sortOrder, content: block.content, settings: {}, requirement_level: block.response ? "required" : "optional", status: "active", visibility: "visible", completion_rule: block.response ? "response_submitted" : "none", custom_renderer_key: null, metadata: { import: { key: IMPORT_KEY, source_course_id: SOURCE_COURSE_ID, source_post_id: block.sourceId, original_title: proposal.source.items.get(block.sourceId)?.post_title || null } } })));
  const insertedBlocks = await db.from("content_blocks").insert(blockRows); if (insertedBlocks.error) throw new Error(`content_blocks: ${insertedBlocks.error.message}`);
  const links = allPages.flatMap(({ page: candidate }) => candidate.blocks.filter((block) => block.resourceUrl && resourceIds.has(block.resourceUrl)).map((block) => ({ content_block_id: block.id, resource_id: resourceIds.get(block.resourceUrl), sort_order: 0 })));
  if (links.length) { const linked = await db.from("content_block_resources").insert(links); if (linked.error) throw new Error(`content_block_resources: ${linked.error.message}`); }
  const responses = allPages.flatMap(({ lesson: entry, page: candidate }) => candidate.blocks.filter((block) => block.response).map((block) => ({ id: uuid(`response:${block.id}`), lesson_id: entry.id, experience_version_id: version.id, block_id: block.id, response_key: block.blockKey.replace(/-/g, "_").slice(0, 80), response_type: block.blockType === "checklist" ? "multi_select" : block.blockType === "structured_response" ? "short_text" : "long_text", label: block.response.prompt, instructions: null, is_required: true, configuration: block.content, raw_visibility: "participant_only", result_visibility: "participant_only", share_mode: "disabled", visibility_settings: {} })));
  if (responses.length) { const result = await db.from("response_definitions").insert(responses); if (result.error) throw new Error(`response_definitions: ${result.error.message}`); }
  return version;
}

const { envelope, course } = loadExport(sourcePath);
const proposal = buildProposal(course);
const db = dbClient();
const state = await targetState(db);
const media = checkMedia ? await probeMedia(proposal.resources) : [];
const output = {
  mode: apply ? "apply" : "dry-run",
  source: { path: sourcePath, schemaVersion: envelope.schema_version, exportedAt: envelope.exported_at, courseId: course.ID, title: course.post_title, topics: course.contents.length, childRecords: course.contents.reduce((sum, topic) => sum + topic.children.length, 0), thumbnailUrl: course.thumbnail_url },
  target: { experienceId: state.experience.id, slug: state.experience.slug, status: state.experience.status, deliveryMode: state.experience.delivery_mode, currentPublishedVersionId: state.experience.current_published_version_id, versions: state.versions.map((version) => ({ id: version.id, label: version.version_label, status: version.status })), currentModules: state.modules.length, alreadyImported: state.alreadyImported },
  proposal: countProposal(proposal),
  media: checkMedia ? { checked: media.length, nativeEligible: media.filter((item) => item.nativeEligible).length, unavailable: media.filter((item) => !item.ok).length, overLimit: media.filter((item) => item.bytes && item.bytes > MAX_NATIVE_BYTES).length, items: media } : { checked: 0 },
  hierarchy: hierarchy(proposal),
};

if (apply) {
  const version = await performImport(db, state, proposal);
  output.createdDraftVersionId = version.id;
  output.confirmation = "Draft curriculum created; no Published Version pointer was changed.";
}

if (asJson) console.log(JSON.stringify(output, null, 2));
else {
  console.log(`Hub Leader Cohort TutorLMS import — ${output.mode}`);
  console.log(JSON.stringify({ source: output.source, target: output.target, proposal: output.proposal, media: output.media }, null, 2));
  console.log("\nProposed Course Navigator\n");
  console.log(output.hierarchy);
  if (!apply) console.log("\nDRY RUN ONLY — no database rows, storage objects, publication state, enrollments, or offerings were changed.");
}
