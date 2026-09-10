import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import type {
  BuilderContentBlock,
  BuilderCourseStructure,
  BuilderLesson,
  BuilderModule,
  BuilderSection,
  ExperienceDeliveryMode,
  ExperienceReleaseType,
  ExperienceSection,
  ExperienceVersionStatus,
  LayoutMode,
  MobileColumnBehavior,
  RequirementLevel,
  SectionColumn,
  SectionCompletionRule,
  SectionLayout,
  SectionRendererMode,
} from "./types";

type Db = ReturnType<typeof createAdminSupabaseClient>;

function requireData<T>(data: T | null, error: { message: string } | null, label: string): T {
  if (error) throw new Error(`Unable to load ${label}: ${error.message}`);
  if (data === null) throw new Error(`Unable to load ${label}.`);
  return data;
}

function requirement(value: string): RequirementLevel {
  return value === "recommended" || value === "optional" ? value : "required";
}

function sectionMode(value: string): SectionRendererMode {
  return value === "custom" || value === "hybrid" || value === "route_handoff" ? value : "builder";
}

function sectionCompletion(value: string): SectionCompletionRule {
  return value === "view" || value === "manual" || value === "response_submitted" ? value : "all_required_blocks";
}

function layoutMode(value: string): LayoutMode {
  return value === "two_column" || value === "three_column" ? value : "single_column";
}

function mobileBehavior(value: string): MobileColumnBehavior {
  return value === "collapsible" || value === "hidden" ? value : "stack";
}

function asBlock(row: Tables<"content_blocks">): BuilderContentBlock {
  return {
    ...row,
    requirement_level: requirement(row.requirement_level),
    status: row.status === "archived" ? "archived" : "active",
    visibility: row.visibility === "hidden" ? "hidden" : "visible",
    completion_rule: ["view", "manual", "interaction", "response_submitted", "media_complete"].includes(row.completion_rule)
      ? row.completion_rule as BuilderContentBlock["completion_rule"]
      : "none",
  };
}

function asSection(row: Tables<"experience_sections">): ExperienceSection {
  return { ...row, requirement_level: requirement(row.requirement_level), renderer_mode: sectionMode(row.renderer_mode), completion_rule: sectionCompletion(row.completion_rule) };
}

function asLayout(row: Tables<"section_layouts">): SectionLayout {
  return { ...row, layout_mode: layoutMode(row.layout_mode) };
}

function asColumn(row: Tables<"section_columns">): SectionColumn {
  return { ...row, mobile_behavior: mobileBehavior(row.mobile_behavior) };
}

function implicitLegacySection(lesson: Tables<"experience_lessons">, blocks: BuilderContentBlock[]): BuilderSection {
  const sectionId = `legacy:${lesson.id}`;
  const layoutId = `legacy-layout:${lesson.id}`;
  const columnId = `legacy-column:${lesson.id}`;
  return {
    id: sectionId,
    lesson_id: lesson.id,
    module_id: lesson.module_id,
    experience_version_id: lesson.experience_version_id,
    section_key: "legacy-content",
    title: lesson.title,
    description: lesson.description,
    sort_order: 0,
    requirement_level: requirement(lesson.requirement_level),
    renderer_mode: "builder",
    custom_renderer_key: null,
    completion_rule: "all_required_blocks",
    settings: {},
    metadata: { implicitLegacySection: true },
    created_at: lesson.created_at,
    updated_at: lesson.updated_at,
    legacy: true,
    layout: {
      id: layoutId,
      section_id: sectionId,
      layout_mode: "single_column",
      participant_resizing_enabled: false,
      settings: {},
      created_at: lesson.created_at,
      updated_at: lesson.updated_at,
      columns: [{
        id: columnId,
        section_layout_id: layoutId,
        section_id: sectionId,
        column_key: "content",
        label: null,
        sort_order: 0,
        width_percent: 100,
        sticky: false,
        collapsible: false,
        default_collapsed: false,
        mobile_order: 0,
        mobile_behavior: "stack",
        settings: {},
        created_at: lesson.created_at,
        updated_at: lesson.updated_at,
        blocks,
      }],
    },
  };
}

export async function getExperienceBySlug(slug: string, db: Db = createAdminSupabaseClient()) {
  const result = await db.from("experiences").select("*").eq("slug", slug).maybeSingle();
  return requireData(result.data, result.error, `Experience ${slug}`);
}

export async function getExperienceVersion(versionId: string, db: Db = createAdminSupabaseClient()) {
  const result = await db.from("experience_versions").select("*").eq("id", versionId).maybeSingle();
  return requireData(result.data, result.error, `Experience Version ${versionId}`);
}

export async function getCurrentPublishedVersion(experienceId: string, db: Db = createAdminSupabaseClient()) {
  const experienceResult = await db.from("experiences").select("current_published_version_id").eq("id", experienceId).maybeSingle();
  const experience = requireData(experienceResult.data, experienceResult.error, `Experience ${experienceId}`);
  if (!experience.current_published_version_id) return null;
  const version = await getExperienceVersion(experience.current_published_version_id, db);
  return version.experience_id === experienceId && version.status === "published" ? version : null;
}

export async function getVersionModules(versionId: string, db: Db = createAdminSupabaseClient()) {
  const result = await db.from("experience_modules").select("*").eq("experience_version_id", versionId).order("sort_order");
  return requireData(result.data, result.error, `modules for Version ${versionId}`);
}

export async function getModuleLessons(moduleId: string, db: Db = createAdminSupabaseClient()) {
  const result = await db.from("experience_lessons").select("*").eq("module_id", moduleId).order("sort_order");
  return requireData(result.data, result.error, `lessons for Module ${moduleId}`);
}

export async function getLessonSections(lessonId: string, db: Db = createAdminSupabaseClient()) {
  const result = await db.from("experience_sections").select("*").eq("lesson_id", lessonId).order("sort_order");
  return requireData(result.data, result.error, `Sections for Lesson ${lessonId}`).map(asSection);
}

export async function getSectionBlocks(sectionId: string, db: Db = createAdminSupabaseClient()) {
  const result = await db.from("content_blocks").select("*").eq("section_id", sectionId).order("sort_order");
  return requireData(result.data, result.error, `blocks for Section ${sectionId}`).map(asBlock);
}

export async function getSectionWithLayout(sectionId: string, db: Db = createAdminSupabaseClient()): Promise<BuilderSection | null> {
  const [sectionResult, layoutResult, columnResult, blockResult] = await Promise.all([
    db.from("experience_sections").select("*").eq("id", sectionId).maybeSingle(),
    db.from("section_layouts").select("*").eq("section_id", sectionId).maybeSingle(),
    db.from("section_columns").select("*").eq("section_id", sectionId).order("sort_order"),
    db.from("content_blocks").select("*").eq("section_id", sectionId).order("sort_order"),
  ]);
  if (sectionResult.error || layoutResult.error || columnResult.error || blockResult.error) throw new Error(`Unable to load Section ${sectionId}.`);
  if (!sectionResult.data) return null;
  const layout = layoutResult.data ? asLayout(layoutResult.data) : null;
  const blocks = (blockResult.data ?? []).map(asBlock);
  return {
    ...asSection(sectionResult.data),
    legacy: false,
    layout: layout ? {
      ...layout,
      columns: (columnResult.data ?? []).map(asColumn).map((column) => ({ ...column, blocks: blocks.filter((block) => block.column_id === column.id) })),
    } : null,
  };
}

export async function getExperienceStructure(experienceId: string, versionId: string, db: Db = createAdminSupabaseClient()): Promise<BuilderCourseStructure> {
  const [experienceResult, versionResult, moduleResult, lessonResult, sectionResult] = await Promise.all([
    db.from("experiences").select("*").eq("id", experienceId).maybeSingle(),
    db.from("experience_versions").select("*").eq("id", versionId).eq("experience_id", experienceId).maybeSingle(),
    db.from("experience_modules").select("*").eq("experience_version_id", versionId).order("sort_order"),
    db.from("experience_lessons").select("*").eq("experience_version_id", versionId).order("sort_order"),
    db.from("experience_sections").select("*").eq("experience_version_id", versionId).order("sort_order"),
  ]);
  if (experienceResult.error || versionResult.error || moduleResult.error || lessonResult.error || sectionResult.error) {
    throw new Error("Unable to load the Experience structure.");
  }
  const experience = requireData(experienceResult.data, null, `Experience ${experienceId}`);
  const version = requireData(versionResult.data, null, `Version ${versionId}`);
  const modules = moduleResult.data ?? [];
  const lessons = lessonResult.data ?? [];
  const sections = (sectionResult.data ?? []).map(asSection);
  const sectionIds = sections.map((section) => section.id);
  const lessonIds = lessons.map((lesson) => lesson.id);
  const [layoutResult, blockResult] = await Promise.all([
    sectionIds.length ? db.from("section_layouts").select("*").in("section_id", sectionIds) : Promise.resolve({ data: [], error: null }),
    lessonIds.length ? db.from("content_blocks").select("*").in("lesson_id", lessonIds).order("sort_order") : Promise.resolve({ data: [], error: null }),
  ]);
  if (layoutResult.error || blockResult.error) throw new Error("Unable to load the Experience content.");
  const layouts = (layoutResult.data ?? []).map(asLayout);
  const layoutIds = layouts.map((layout) => layout.id);
  const columnResult = layoutIds.length
    ? await db.from("section_columns").select("*").in("section_layout_id", layoutIds).order("sort_order")
    : { data: [], error: null };
  if (columnResult.error) throw new Error("Unable to load the Experience layout columns.");
  const columns = (columnResult.data ?? []).map(asColumn);
  const blocks = (blockResult.data ?? []).map(asBlock);

  const builtModules: BuilderModule[] = modules.map((module) => ({
    ...module,
    requirement_level: requirement(module.requirement_level),
    lessons: lessons.filter((lesson) => lesson.module_id === module.id).map((lesson): BuilderLesson => {
      const lessonSections = sections.filter((section) => section.lesson_id === lesson.id);
      const builtSections = lessonSections.map((section): BuilderSection => {
        const layout = layouts.find((candidate) => candidate.section_id === section.id) ?? null;
        const layoutColumns = layout ? columns.filter((column) => column.section_layout_id === layout.id) : [];
        return {
          ...section,
          legacy: false,
          layout: layout ? { ...layout, columns: layoutColumns.map((column) => ({ ...column, blocks: blocks.filter((block) => block.column_id === column.id) })) } : null,
        };
      });
      const legacyBlocks = blocks.filter((block) => block.lesson_id === lesson.id && block.section_id === null);
      return {
        ...lesson,
        requirement_level: requirement(lesson.requirement_level),
        sections: builtSections.length === 0 && legacyBlocks.length > 0 ? [implicitLegacySection(lesson, legacyBlocks)] : builtSections,
      };
    }),
  }));

  return {
    experience: { ...experience, delivery_mode: experience.delivery_mode as ExperienceDeliveryMode },
    version: { ...version, status: version.status as ExperienceVersionStatus, release_type: version.release_type as ExperienceReleaseType | null },
    modules: builtModules,
  };
}
