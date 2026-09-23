#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const valueArg = (name) => args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
const requestedCourseId = Number(valueArg("--course") ?? 888);
const PROFILES = {
  888: { id: 888, title: "Kaleo Disciple Training", slug: "kaleo", experienceId: "88f5fcc4-390a-4df3-842b-e9d5197ae38e", zipEntry: "888 - Kaleo Disciple Training/888.json", lessons: 150 },
  969: { id: 969, title: "Kaleo Disciple Leader", slug: "kaleo-disciple-leader", experienceId: "de3b6dbd-4139-4028-924c-246c76477a65", zipEntry: "969 - Kaleo Disciple Leader/969.json", lessons: 185 },
};
const profile = PROFILES[requestedCourseId];
if (!profile) throw new Error(`Unsupported Kaleo source course ${requestedCourseId}.`);
export const SOURCE_COURSE_ID = profile.id;
export const TARGET_EXPERIENCE_ID = profile.experienceId;
export const TARGET_SLUG = profile.slug;
export const IMPORT_KEY = `tutorlms-${profile.id}-2026-09-22`;
const ZIP_ENTRY = profile.zipEntry;
const sourcePath = valueArg("--source");
const apply = args.includes("--apply");

function decode(value) {
  const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return String(value ?? "").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match);
}

export function normalizeTopicTitle(title) { return String(title).trim().replace(/^\*\s*(Week\s+\d+)$/i, "$1"); }
export function slug(value, fallback = "item") { return String(value).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72) || fallback; }
function uuid(scope) { const h = createHash("sha256").update(`${IMPORT_KEY}:${scope}`).digest("hex").slice(0, 32).split(""); h[12] = "4"; h[16] = ((parseInt(h[16], 16) & 3) | 8).toString(16); return `${h.slice(0,8).join("")}-${h.slice(8,12).join("")}-${h.slice(12,16).join("")}-${h.slice(16,20).join("")}-${h.slice(20).join("")}`; }
function allUrls(value) { return [...new Set([...String(value ?? "").matchAll(/https?:\/\/[^\s"'<>\]]+/gi)].map((match) => decode(match[0]).replace(/\[\/embed$/i, "").replace(/[),.;]+$/, "")))]; }
function attachmentKind(url) { const path = new URL(url).pathname.toLowerCase(); if (/\.(png|jpe?g|gif|webp)$/.test(path)) return "image"; if (/\.pdf$/.test(path)) return "pdf"; return "download"; }
function titleFromUrl(url) { try { return decodeURIComponent(basename(new URL(url).pathname)).replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Course resource"; } catch { return "Course resource"; } }
export function tutorVideo(item) { const video = item.meta?._video?.[0] ?? {}; return video.source_youtube || video.source_vimeo || video.source_external_url || video.source_embedded || ""; }
export function unsupportedEmbeds(item) {
  const source = `${item.post_content ?? ""}\n${Object.entries(item.meta ?? {}).filter(([key]) => key.startsWith("_oembed_")).flatMap(([, values]) => values).join("\n")}`;
  const urls = allUrls(source).filter((url) => /jotform|typeform|getformly|<iframe/i.test(url) || /form\./i.test(new URL(url).hostname));
  const shortcode = [...String(item.post_content ?? "").matchAll(/\[(?:embed|formidable|gravityform|contact-form-7)[^\]]*\](?:([^[]+)\[\/embed\])?/gi)].map((match) => match[0]);
  return { urls: [...new Set(urls)], shortcode: [...new Set(shortcode)], jotform: urls.some((url) => /jotform/i.test(url)) };
}

function htmlToMarkdown(html) {
  return decode(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "").replace(/\[embed\][\s\S]*?\[\/embed\]/gi, "").replace(/\[(?:formidable|gravityform|contact-form-7)[^\]]*\]/gi, "")
    .replace(/<img\b[^>]*>/gi, "").replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => `[${label.replace(/<[^>]+>/g, "").trim() || href}](${decode(href)})`)
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**").replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*")
    .replace(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/gi, "\n# $1\n").replace(/<h[3-6]\b[^>]*>([\s\S]*?)<\/h[3-6]>/gi, "\n## $1\n")
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1").replace(/<(br|hr)\b[^>]*\/?\s*>/gi, "\n").replace(/<\/(p|div|blockquote|ul|ol)>/gi, "\n")
    .replace(/<(p|div|blockquote|ul|ol)\b[^>]*>/gi, "\n").replace(/<[^>]+>/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function richTextChunks(text, limit = 12000) {
  if (!text) return [];
  if (text.length <= limit) return [text];
  const chunks = []; let remaining = text;
  while (remaining.length > limit) {
    const paragraphBreak = remaining.lastIndexOf("\n\n", limit);
    const lineBreak = remaining.lastIndexOf("\n", limit);
    const splitAt = paragraphBreak > limit / 2 ? paragraphBreak : lineBreak > limit / 2 ? lineBreak : limit;
    chunks.push(remaining.slice(0, splitAt).trim()); remaining = remaining.slice(splitAt).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

export function loadExport(path) {
  const raw = extname(path).toLowerCase() === ".zip" ? execFileSync("unzip", ["-p", path, ZIP_ENTRY], { encoding: "utf8", maxBuffer: 5 * 1024 * 1024 }) : readFileSync(path, "utf8");
  const envelope = JSON.parse(raw); const course = envelope?.data?.[0]?.data?.course;
  if (!course || Number(course.ID) !== SOURCE_COURSE_ID) throw new Error(`The source is not TutorLMS course ${SOURCE_COURSE_ID}.`);
  return { envelope, course };
}

export function buildProposal(course) {
  if (course.contents.length !== 34) throw new Error(`Expected 34 topics; found ${course.contents.length}.`);
  const resources = new Map(); const unsupported = []; let blockCount = 0;
  const modules = course.contents.map((topic, moduleOrder) => {
    const title = normalizeTopicTitle(topic.post_title); const moduleKey = slug(title, `topic-${topic.ID}`); const moduleId = uuid(`module:${topic.ID}`);
    return { id: moduleId, key: moduleKey, title, sourceTitle: topic.post_title, sourceId: Number(topic.ID), sortOrder: moduleOrder, lessons: topic.children.map((item, lessonOrder) => {
      const lessonId = uuid(`lesson:${item.ID}`); const sectionId = uuid(`section:${item.ID}`); const layoutId = uuid(`layout:${item.ID}`); const columnId = uuid(`column:${item.ID}`); const blocks = [];
      const cleaned = htmlToMarkdown(item.post_content);
      for (const [chunkIndex, text] of richTextChunks(cleaned).entries()) blocks.push({ type: "rich_text", content: { title: chunkIndex === 0 ? item.post_title : `${item.post_title} (continued)`, text }, suffix: `content-${chunkIndex + 1}` });
      const video = tutorVideo(item); if (video) blocks.push({ type: "video", content: { title: item.post_title, description: "", url: video, caption: "", alt: "", linkLabel: "Watch video" }, suffix: "video" });
      for (const url of [...new Set(item.attachment_links ?? [])]) { let kind; try { kind = attachmentKind(url); } catch { continue; } const title = titleFromUrl(url); resources.set(url, { url, kind, title, sourceIds: [...new Set([...(resources.get(url)?.sourceIds ?? []), Number(item.ID)])] }); blocks.push({ type: kind === "pdf" ? "pdf_reader" : kind === "image" ? "image" : "document", content: kind === "pdf" ? { title, description: "", readerMode: "reader", showReader: true, allowDownload: true, allowOpenInNewTab: true } : { title, description: "", url: "", caption: "", alt: kind === "image" ? title : "", linkLabel: kind === "image" ? "" : "Open or download file" }, suffix: `resource-${createHash("sha1").update(url).digest("hex").slice(0,8)}`, resourceUrl: url }); }
      const embeds = unsupportedEmbeds(item); if (embeds.urls.length || embeds.shortcode.length) { const required = /required/i.test(item.post_title); unsupported.push({ sourceId: Number(item.ID), title: item.post_title, required, ...embeds }); blocks.push({ type: "callout", content: { title: required ? "Required legacy activity — needs migration review" : "Legacy embedded activity — needs migration review", body: `Preserved from TutorLMS lesson “${item.post_title}”. Source embed: ${[...embeds.urls, ...embeds.shortcode].join(" | ")}`, treatment: "warning" }, suffix: "unsupported-embed", required }); }
      const hydrated = blocks.map((block, index) => ({ ...block, id: uuid(`block:${item.ID}:${block.suffix}`), key: slug(`${block.suffix}-${item.ID}`, `block-${index+1}`), sortOrder: index })); blockCount += hydrated.length;
      return { id: lessonId, key: slug(item.post_name || item.post_title, `lesson-${item.ID}`), title: item.post_title, sourceId: Number(item.ID), sourceGuid: item.guid, sortOrder: lessonOrder, required: /required/i.test(item.post_title) || /^\s*required\s*:/i.test(cleaned), section: { id: sectionId, key: "content", layoutId, columnId, blocks: hydrated } };
    }) };
  });
  return { modules, resources: [...resources.values()], unsupported, counts: { modules: modules.length, lessons: modules.reduce((n,m)=>n+m.lessons.length,0), sections: modules.reduce((n,m)=>n+m.lessons.length,0), blocks: blockCount } };
}

function dbClient() { if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) throw new Error("Load .env.local."); return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }); }
async function targetState(db) { const exact = await db.from("experiences").select("*").eq("id", TARGET_EXPERIENCE_ID).maybeSingle(); if (exact.error) throw exact.error; const slugMatch = await db.from("experiences").select("*").eq("slug", TARGET_SLUG).maybeSingle(); if (slugMatch.error) throw slugMatch.error; if (exact.data && exact.data.slug !== TARGET_SLUG) throw new Error(`Target ID ${TARGET_EXPERIENCE_ID} belongs to a different Experience.`); if (slugMatch.data && slugMatch.data.id !== TARGET_EXPERIENCE_ID) throw new Error(`Slug ${TARGET_SLUG} already belongs to another Experience.`); const experience=exact.data??slugMatch.data; const versions = experience ? await db.from("experience_versions").select("*").eq("experience_id", experience.id) : {data:[],error:null}; if (versions.error) throw versions.error; const versionIds = versions.data.map(v=>v.id); const modules = versionIds.length ? await db.from("experience_modules").select("id,metadata").in("experience_version_id", versionIds) : { data: [], error: null }; if (modules.error) throw modules.error; return { experience, versions: versions.data, modules: modules.data ?? [], alreadyImported: (modules.data ?? []).some(m=>m.metadata?.import?.key===IMPORT_KEY) }; }
async function reachable(url) { try { const response = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(15000) }); return { ok: response.ok, status: response.status, mime: response.headers.get("content-type")?.split(";")[0] ?? null }; } catch (error) { return { ok: false, status: null, mime: null, error: error instanceof Error ? error.message : String(error) }; } }
async function resolveResources(db, proposal) { const existing = await db.from("resources").select("id,external_url,metadata"); if (existing.error) throw existing.error; const map = new Map(); let created=0, reused=0, missing=0; for (const resource of proposal.resources) { const found=(existing.data??[]).find(row=>row.external_url===resource.url || row.metadata?.import?.source_url===resource.url); if(found){map.set(resource.url,found.id);reused++;continue;} const probe=await reachable(resource.url); if(!probe.ok){resource.unavailable=probe;missing++;continue;} const id=uuid(`resource:${resource.url}`); const result=await db.from("resources").insert({id,title:resource.title.slice(0,200),description:`Imported from Kaleo TutorLMS course ${SOURCE_COURSE_ID}.`,resource_type:resource.kind,status:"active",external_url:resource.url,metadata:{import:{key:IMPORT_KEY,source_course_id:SOURCE_COURSE_ID,source_url:resource.url,source_post_ids:resource.sourceIds,observed_mime_type:probe.mime}}}).select("id").single(); if(result.error) throw result.error; map.set(resource.url,result.data.id);created++; } return {map,created,reused,missing}; }

async function performImport(db, state, proposal, course) {
  if (state.alreadyImported) throw new Error(`Kaleo course ${SOURCE_COURSE_ID} was already imported.`); if (state.versions.some(v=>v.status==="published")) throw new Error("A Published Kaleo Version exists; stopping before mutation."); if (state.versions.some(v=>v.status==="draft")) throw new Error("An existing Draft Version requires manual review before import."); if (state.modules.length) throw new Error("Existing Kaleo curriculum found; stopping before mutation.");
  const thumbnail = typeof course.thumbnail_url === "string" ? { url: course.thumbnail_url, kind: "image", title: profile.title, sourceIds: [SOURCE_COURSE_ID] } : null; if (thumbnail && !proposal.resources.some(r=>r.url===thumbnail.url)) proposal.resources.push(thumbnail);
  let experience=state.experience; if(!experience){const created=await db.from("experiences").insert({id:TARGET_EXPERIENCE_ID,slug:TARGET_SLUG,name:profile.title,description:htmlToMarkdown(course.post_content).slice(0,3000)||null,experience_type:"course",delivery_mode:"builder",status:"draft",accent_color:"#008037",visibility:"private",admission_policy:"admin_assigned"}).select("*").single();if(created.error)throw created.error;experience=created.data;}
  const resources=await resolveResources(db,proposal); const thumbnailId=thumbnail ? resources.map.get(thumbnail.url) ?? null : null;
  const versionId=uuid("version"); const version=await db.from("experience_versions").insert({id:versionId,experience_id:experience.id,version_label:`TutorLMS ${SOURCE_COURSE_ID} import draft`,status:"draft",title:profile.title,description:htmlToMarkdown(course.post_content).slice(0,4000)||"A 32-week relational disciple-training journey imported from TutorLMS for Builder review.",published_at:null,release_type:"major",shell_mode:"enhanced",course_configuration:{terminology:{group_label:"week"},companion_mode:"enhanced",card:{image_resource_id:thumbnailId,headline:null,supporting_text:null,eyebrow:"Everyday Disciple"},appearance:{header_treatment:thumbnailId?"image":"minimal",reading_width:"standard",accent_color:"#008037",cover_resource_id:thumbnailId,logo_resource_id:null,header_logo_mode:"purposeos",header_logo_resource_id:null,colors:{}}}}).select("id").single(); if(version.error) throw version.error;
  const updated=await db.from("experiences").update({name:profile.title,delivery_mode:"builder",status:"draft",accent_color:"#008037"}).eq("id",experience.id).is("current_published_version_id",null); if(updated.error) throw updated.error;
  const modules=proposal.modules.map(m=>({id:m.id,experience_version_id:versionId,module_key:m.key,title:m.title,sort_order:m.sortOrder,is_required:true,requirement_level:"required",metadata:{import:{key:IMPORT_KEY,source_course_id:SOURCE_COURSE_ID,source_topic_id:m.sourceId,source_title:m.sourceTitle}}}));
  const lessons=proposal.modules.flatMap(m=>m.lessons.map(l=>({id:l.id,module_id:m.id,experience_version_id:versionId,lesson_key:l.key,title:l.title,sort_order:l.sortOrder,is_required:l.required,requirement_level:l.required?"required":"recommended",completion_rule:"blocks_complete",metadata:{import:{key:IMPORT_KEY,source_course_id:SOURCE_COURSE_ID,source_topic_id:m.sourceId,source_post_id:l.sourceId,source_url:l.sourceGuid}}})));
  const sections=proposal.modules.flatMap(m=>m.lessons.map(l=>({id:l.section.id,lesson_id:l.id,module_id:m.id,experience_version_id:versionId,section_key:l.section.key,title:l.title,sort_order:0,requirement_level:l.required?"required":"recommended",renderer_mode:"builder",completion_rule:"view",settings:{},metadata:{import:{key:IMPORT_KEY,source_course_id:SOURCE_COURSE_ID,source_post_id:l.sourceId}}})));
  for(const [table,rows] of [["experience_modules",modules],["experience_lessons",lessons],["experience_sections",sections]]){const result=await db.from(table).insert(rows);if(result.error)throw new Error(`${table}: ${result.error.message}`);}
  const layouts=proposal.modules.flatMap(m=>m.lessons.map(l=>({id:l.section.layoutId,section_id:l.section.id,layout_mode:"single_column",participant_resizing_enabled:false,settings:{}}))); const columns=proposal.modules.flatMap(m=>m.lessons.map(l=>({id:l.section.columnId,section_layout_id:l.section.layoutId,section_id:l.section.id,column_key:"main",sort_order:0,width_percent:100,sticky:false,collapsible:false,default_collapsed:false,mobile_order:0,mobile_behavior:"stack",settings:{}}))); await db.from("section_layouts").insert(layouts).throwOnError(); await db.from("section_columns").insert(columns).throwOnError();
  const all=proposal.modules.flatMap(m=>m.lessons.map(l=>({m,l}))); const blocks=all.flatMap(({l})=>l.section.blocks.map(b=>({id:b.id,lesson_id:l.id,section_id:l.section.id,column_id:l.section.columnId,block_key:b.key,block_type:b.type,sort_order:b.sortOrder,content:b.content,settings:{},requirement_level:b.required?"required":"optional",status:"active",visibility:"visible",completion_rule:"none",metadata:{import:{key:IMPORT_KEY,source_course_id:SOURCE_COURSE_ID,source_post_id:l.sourceId}}}))); await db.from("content_blocks").insert(blocks).throwOnError(); const links=all.flatMap(({l})=>l.section.blocks.filter(b=>b.resourceUrl&&resources.map.has(b.resourceUrl)).map(b=>({content_block_id:b.id,resource_id:resources.map.get(b.resourceUrl),sort_order:0}))); if(links.length)await db.from("content_block_resources").insert(links).throwOnError();
  const companions=[{type:"personal_notes",audience:"personal",availability:"both",title:"Personal Notes"},{type:"resources",audience:"personal",availability:"both",title:"Course Resources"},{type:"chat",audience:"group",availability:"cohort",title:"Cohort Chat"},{type:"video_call",audience:"group",availability:"cohort",title:"Video Conference"},{type:"group_members",audience:"group",availability:"cohort",title:"Cohort Members"}].map((c,i)=>({id:uuid(`companion:${c.type}`),experience_version_id:versionId,module_type:c.type,scope:"course",audience:c.audience,availability_context:c.availability,display_title:c.title,sort_order:i,visibility:"visible",configuration:{},created_by:null})); await db.from("companion_modules").insert(companions).throwOnError();
  return {versionId,resources:{created:resources.created,reused:resources.reused,missing:resources.missing},blocks};
}

async function main() { if(!sourcePath)throw new Error(`Pass --source=/absolute/path/to/${SOURCE_COURSE_ID}.zip`); if(apply&&(valueArg("--confirm-source-course")!==String(SOURCE_COURSE_ID)||valueArg("--confirm-target")!==TARGET_EXPERIENCE_ID))throw new Error(`Apply requires --confirm-source-course=${SOURCE_COURSE_ID} and --confirm-target=${TARGET_EXPERIENCE_ID}.`); const {envelope,course}=loadExport(sourcePath); const proposal=buildProposal(course); if(proposal.counts.lessons!==profile.lessons)throw new Error(`Expected ${profile.lessons} lessons; found ${proposal.counts.lessons}.`); const db=dbClient(); const state=await targetState(db); const byType=Object.fromEntries([...new Set(proposal.modules.flatMap(m=>m.lessons.flatMap(l=>l.section.blocks.map(b=>b.type))))].sort().map(type=>[type,proposal.modules.flatMap(m=>m.lessons.flatMap(l=>l.section.blocks)).filter(b=>b.type===type).length])); const output={mode:apply?"apply":"dry-run",source:{courseId:course.ID,title:course.post_title,topics:course.contents.length,lessons:course.contents.flatMap(t=>t.children).length,keepUserData:envelope.keep_user_data,thumbnail:course.thumbnail_url},target:state.experience?{experienceId:state.experience.id,slug:state.experience.slug,name:state.experience.name,deliveryMode:state.experience.delivery_mode,versions:state.versions.map(v=>({id:v.id,status:v.status,label:v.version_label})),alreadyImported:state.alreadyImported}:{experienceId:TARGET_EXPERIENCE_ID,slug:TARGET_SLUG,name:profile.title,deliveryMode:"builder",versions:[],alreadyImported:false,willCreate:true},proposal:{...proposal.counts,blocksByType:byType,uniqueResources:proposal.resources.length,unsupported:proposal.unsupported}}; if(apply)output.created=await performImport(db,state,proposal,course); console.log(JSON.stringify(output,null,2)); if(!apply)console.error("DRY RUN ONLY — no rows, storage objects, or publication state changed."); }
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main().catch(error=>{console.error(error);process.exitCode=1;});
