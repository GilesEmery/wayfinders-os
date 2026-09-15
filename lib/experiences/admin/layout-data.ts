import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function getSectionLayoutWorkspace(experienceId: string, versionId: string, sectionId: string) {
  const db = createAdminSupabaseClient();
  const [experience, version, section, layout] = await Promise.all([
    db.from("experiences").select("id,name,delivery_mode,default_theme_id").eq("id", experienceId).maybeSingle(),
    db.from("experience_versions").select("id,experience_id,version_label,title,status,theme_id").eq("id", versionId).eq("experience_id", experienceId).maybeSingle(),
    db.from("experience_sections").select("*").eq("id", sectionId).eq("experience_version_id", versionId).maybeSingle(),
    db.from("section_layouts").select("*").eq("section_id", sectionId).maybeSingle(),
  ]);
  if (experience.error || version.error || section.error || layout.error) throw new Error("Unable to load the Section layout workspace.");
  if (!experience.data || !version.data || !section.data) return null;
  const [module, lesson, columns, blocks, theme] = await Promise.all([
    db.from("experience_modules").select("id,title").eq("id", section.data.module_id).eq("experience_version_id", versionId).maybeSingle(),
    db.from("experience_lessons").select("id,title,module_id").eq("id", section.data.lesson_id).eq("experience_version_id", versionId).maybeSingle(),
    layout.data ? db.from("section_columns").select("*").eq("section_layout_id", layout.data.id).eq("section_id", sectionId).order("sort_order") : Promise.resolve({ data: [], error: null }),
    db.from("content_blocks").select("*").eq("section_id", sectionId).order("sort_order").order("created_at"),
    version.data.theme_id || experience.data.default_theme_id ? db.from("experience_themes").select("configuration").eq("id", version.data.theme_id ?? experience.data.default_theme_id!).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (module.error || lesson.error || columns.error || blocks.error || theme.error || !module.data || !lesson.data || lesson.data.module_id !== module.data.id) throw new Error("Section hierarchy integrity check failed.");
  return { experience: experience.data, version: version.data, module: module.data, lesson: lesson.data, section: section.data, layout: layout.data, columns: columns.data ?? [], blocks: blocks.data ?? [], themeConfiguration: theme.data?.configuration ?? null };
}
