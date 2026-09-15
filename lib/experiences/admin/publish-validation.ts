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

  const sections = structure.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.sections));
  for (const section of sections) {
    const required = section.requirement_level === "required";
    if (section.renderer_mode === "builder" || (section.renderer_mode === "hybrid" && !section.custom_renderer_key)) {
      if (required && (!section.layout || !section.layout.columns.length)) throw new Error(`Required Page “${section.title}” has no participant layout.`);
      if (required && !section.layout?.columns.some((column) => column.blocks.some((block) => block.status === "active" && block.visibility === "visible"))) {
        throw new Error(`Required Page “${section.title}” has no participant Content.`);
      }
      continue;
    }
    const key = section.custom_renderer_key;
    const adapter = key ? section.renderer_mode === "route_handoff" ? getRouteHandoff(key) : getSectionRenderer(key) : null;
    if (required && !adapter) throw new Error(`Required Page “${section.title}” uses an unavailable renderer.`);
    if (adapter) {
      const result = adapter.validateConfiguration(section.settings);
      if (required && !result.ok) throw new Error(`Required Page “${section.title}” has invalid renderer settings.`);
      // The current participant shell has no custom/hybrid Section component.
      if (required && section.renderer_mode !== "route_handoff") throw new Error(`Required Page “${section.title}” cannot render in the participant shell yet.`);
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
  const definitions = new Map((definitionsResult.data ?? []).filter((item) => item.block_id).map((item) => [item.block_id!, item]));
  for (const block of blocksResult.data ?? []) {
    if (block.status !== "active" || block.visibility !== "visible") continue;
    const required = block.requirement_level === "required";
    const definition = getBlockDefinition(block.block_type);
    if (!definition || definition.availability !== "available") {
      if (required) throw new Error(`Required Block “${block.block_key}” is not supported by the participant runtime.`);
      continue; // Existing optional/recommended unavailable fallback.
    }
    const parsed = parseBlockConfiguration(block.block_type, block.content);
    if (!parsed.ok && required) throw new Error(`Required Block “${block.block_key}” has invalid configuration: ${parsed.errors.join(" ")}`);
    if (definition.previewKey === "media" && required && (!parsed.ok || !safeExternalUrl(parsed.value.url))) {
      throw new Error(`Required ${definition.label} Block “${block.block_key}” needs an authored HTTPS source before publication.`);
    }
    if (required && block.custom_renderer_key && block.custom_renderer_key !== definition.participantRendererKey) {
      throw new Error(`Required Block “${block.block_key}” uses an unavailable renderer.`);
    }
    if (required && (!block.section_id || !block.column_id)) throw new Error(`Required Block “${block.block_key}” is not placed in a Page Column.`);
    if (definition.response && required) {
      const response = definitions.get(block.id);
      if (!response || response.lesson_id !== block.lesson_id || response.response_type !== definition.response.responseType) {
        throw new Error(`Required response Block “${block.block_key}” lacks a matching response definition.`);
      }
      if (!response.label?.trim()) {
        throw new Error(`Required response Block “${block.block_key}” needs an authored question or prompt before publication.`);
      }
      if (definition.response.responseKind === "single_select" || definition.response.responseKind === "multi_select") {
        const config = response.configuration && typeof response.configuration === "object" && !Array.isArray(response.configuration)
          ? response.configuration as Record<string, unknown> : {};
        if (!validateResponseOptions(config.options).ok) throw new Error(`Required response Block “${block.block_key}” has invalid response options.`);
      }
    }
    if (required && block.completion_rule === "response_submitted" && !definitions.has(block.id)) {
      throw new Error(`Required response-completed Block “${block.block_key}” lacks a response definition.`);
    }
  }
}
