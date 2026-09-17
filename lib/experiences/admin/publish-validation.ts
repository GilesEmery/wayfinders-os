import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getExperienceStructure } from "@/lib/experiences/builder/data";
import { getBlockDefinition, parseBlockConfiguration } from "@/lib/experiences/builder/block-registry";
import { getRouteHandoff, getSectionRenderer } from "@/lib/experiences/builder/runtime-registry";
import { validateResponseOptions } from "@/lib/experiences/builder/response-registry";
import { safeExternalUrl } from "@/lib/experiences/builder/media-source";

/** SQL owns relational readiness; this is the source-controlled runtime contract. */
export async function validatePublishRuntime(experienceId: string, versionId: string): Promise<void> {
  const db = createAdminSupabaseClient();
  const structure = await getExperienceStructure(experienceId, versionId, db);
  if (structure.version.status !== "draft") throw new Error("This Version is no longer Draft. Reload before publishing.");
  if (structure.experience.delivery_mode === "custom_code") throw new Error("Custom-coded Experiences are published through their existing source-controlled workflow.");
  const issues: string[] = [];

  const sections = structure.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.sections));
  for (const section of sections) {
    const required = section.requirement_level === "required";
    if (section.renderer_mode === "builder" || (section.renderer_mode === "hybrid" && !section.custom_renderer_key)) {
      if (required && (!section.layout || !section.layout.columns.length)) issues.push(`Page “${section.title}” has no participant layout.`);
      if (required && !section.layout?.columns.some((column) => column.blocks.some((block) => block.status === "active" && block.visibility === "visible"))) {
        issues.push(`Page “${section.title}” has no visible Content.`);
      }
      continue;
    }
    const key = section.custom_renderer_key;
    const adapter = key ? section.renderer_mode === "route_handoff" ? getRouteHandoff(key) : getSectionRenderer(key) : null;
    if (required && !adapter) issues.push(`Page “${section.title}” uses an unavailable renderer.`);
    if (adapter) {
      const result = adapter.validateConfiguration(section.settings);
      if (required && !result.ok) issues.push(`Page “${section.title}” has invalid renderer settings.`);
      // The current participant shell has no custom/hybrid Section component.
      if (required && section.renderer_mode !== "route_handoff") issues.push(`Page “${section.title}” cannot render in the participant shell yet.`);
    }
  }

  const lessons = structure.modules.flatMap((module) => module.lessons);
  const lessonIds = lessons.map((lesson) => lesson.id);
  if (!lessonIds.length) return; // SQL reports the empty curriculum precisely.
  const [blocksResult, definitionsResult] = await Promise.all([
    db.from("content_blocks").select("id,lesson_id,section_id,column_id,block_key,block_type,content,custom_renderer_key,requirement_level,status,visibility,completion_rule").in("lesson_id", lessonIds),
    db.from("response_definitions").select("id,block_id,lesson_id,experience_version_id,response_type,label,configuration,is_required").eq("experience_version_id", versionId),
  ]);
  if (blocksResult.error || definitionsResult.error) throw new Error("Unable to validate the participant Content before publication.");
  const blockIds = (blocksResult.data ?? []).map((block) => block.id);
  const linksResult = blockIds.length ? await db.from("content_block_resources").select("content_block_id,resource_id").in("content_block_id", blockIds) : { data: [], error: null };
  if (linksResult.error) throw new Error("Unable to validate uploaded Content assets before publication.");
  const resourceIds = [...new Set((linksResult.data ?? []).map((link) => link.resource_id))];
  const resourcesResult = resourceIds.length
    ? await db.from("resources").select("id,resource_type,status,storage_bucket,storage_path,mime_type").in("id", resourceIds).eq("status", "active")
    : { data: [], error: null };
  if (resourcesResult.error) throw new Error("Unable to verify uploaded Content assets before publication.");
  const resources = new Map((resourcesResult.data ?? []).map((resource) => [resource.id, resource]));
  const definitions = new Map((definitionsResult.data ?? []).filter((item) => item.block_id).map((item) => [item.block_id!, item]));
  for (const block of blocksResult.data ?? []) {
    if (block.status !== "active" || block.visibility !== "visible") continue;
    const required = block.requirement_level === "required";
    const definition = getBlockDefinition(block.block_type);
    if (!definition || definition.availability !== "available") {
      if (required) issues.push(`Block “${block.block_key}” is not supported by the participant runtime.`);
      continue; // Existing optional/recommended unavailable fallback.
    }
    const parsed = parseBlockConfiguration(block.block_type, block.content);
    if (!parsed.ok && required) issues.push(`Block “${block.block_key}” has invalid configuration: ${parsed.errors.join(" ")}`);
    const nativeAsset = (linksResult.data ?? []).filter((link) => link.content_block_id === block.id).some((link) => {
      const resource = resources.get(link.resource_id);
      if (!resource?.storage_bucket || !resource.storage_path) return false;
      if (block.block_type === "pdf_reader") return resource.resource_type === "pdf" && resource.mime_type === "application/pdf";
      return block.block_type === "image" ? resource.resource_type === "image" : ["pdf", "download", "worksheet", "guide"].includes(resource.resource_type);
    });
    if (definition.previewKey === "pdf_reader" && (!parsed.ok || !nativeAsset)) {
      issues.push(`PDF Reader “${block.block_key}” needs an active uploaded PDF.`);
    }
    if (definition.previewKey === "media" && (!parsed.ok || (!safeExternalUrl(parsed.value.url) && !nativeAsset))) {
      issues.push(`${definition.label} “${block.block_key}” needs an uploaded asset or HTTPS source.`);
    }
    if (required && block.custom_renderer_key && block.custom_renderer_key !== definition.participantRendererKey) {
      issues.push(`Block “${block.block_key}” uses an unavailable renderer.`);
    }
    if (required && (!block.section_id || !block.column_id)) issues.push(`Block “${block.block_key}” is not placed in a Page Content area.`);
    if (definition.response && required) {
      const response = definitions.get(block.id);
      if (!response || response.lesson_id !== block.lesson_id || response.response_type !== definition.response.responseType) {
        issues.push(`Response “${block.block_key}” is missing its response definition.`);
        continue;
      }
      if (!response.label?.trim()) {
        issues.push(`Response “${block.block_key}” needs a question or prompt.`);
      }
      if (definition.response.responseKind === "single_select" || definition.response.responseKind === "multi_select") {
        const config = response.configuration && typeof response.configuration === "object" && !Array.isArray(response.configuration)
          ? response.configuration as Record<string, unknown> : {};
        if (!validateResponseOptions(config.options).ok) issues.push(`Response “${block.block_key}” has invalid options.`);
      }
    }
    if (required && block.completion_rule === "response_submitted" && !definitions.has(block.id)) {
      issues.push(`Response-completed Block “${block.block_key}” is missing its response definition.`);
    }
  }
  if (issues.length) {
    const visible = issues.slice(0, 8);
    const remaining = issues.length - visible.length;
    throw new Error(`Publish blocked by ${issues.length} issue${issues.length === 1 ? "" : "s"}: ${visible.join(" • ")}${remaining ? ` • Plus ${remaining} more.` : ""}`);
  }
}
