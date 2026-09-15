import "server-only";

import { audit, requireAdmin } from "@/lib/admin/auth";
import { canBuildExperienceById, getAuthorizationContext } from "@/lib/platform/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import type { LayoutMode, MobileColumnBehavior, SectionColumn } from "../builder/types";
import { assertVersionEditable, validateSectionLayout } from "../builder/validation";

const MODES: Record<LayoutMode, number> = { single_column: 1, two_column: 2, three_column: 3 };
const KEYS = ["left", "main", "right"];
const MOBILE = new Set<MobileColumnBehavior>(["stack", "collapsible", "hidden"]);

async function authorized(experienceId: string, versionId: string, sectionId: string) {
  const admin = await requireAdmin();
  const auth = await getAuthorizationContext(admin.id, admin.email);
  if (!await canBuildExperienceById(auth, experienceId)) throw new Error("You are not authorized to author this Experience.");
  const db = createAdminSupabaseClient();
  const [version, section] = await Promise.all([
    db.from("experience_versions").select("id,status").eq("id", versionId).eq("experience_id", experienceId).maybeSingle(),
    db.from("experience_sections").select("id").eq("id", sectionId).eq("experience_version_id", versionId).maybeSingle(),
  ]);
  if (!version.data || !section.data) throw new Error("Section does not belong to the requested Experience Version.");
  assertVersionEditable(version.data.status);
  return { admin, db };
}

function widths(form: FormData, count: number) {
  const values = Array.from({ length: count }, (_, index) => Number(form.get(`width_${index}`)));
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) throw new Error("Every desktop column requires a positive width.");
  if (Math.abs(values.reduce((sum, value) => sum + value, 0) - 100) > .01) throw new Error("Column widths must total 100%.");
  return values;
}

function columnKey(index: number, count: number) { return count === 1 ? "main" : count === 2 ? ["left", "main"][index] : KEYS[index]; }

export async function configureSectionLayout(experienceId: string, versionId: string, sectionId: string, form: FormData) {
  const { admin, db } = await authorized(experienceId, versionId, sectionId);
  const mode = String(form.get("layout_mode")) as LayoutMode;
  if (!(mode in MODES)) throw new Error("Invalid layout mode.");
  const count = MODES[mode];
  const selectedWidths = widths(form, count);
  const existingLayout = await db.from("section_layouts").select("*").eq("section_id", sectionId).maybeSingle();
  if (existingLayout.error) throw new Error(`Unable to load layout: ${existingLayout.error.message}`);
  let layout = existingLayout.data;
  if (!layout) {
    const created = await db.from("section_layouts").insert({ section_id: sectionId, layout_mode: mode, participant_resizing_enabled: form.get("participant_resizing_enabled") === "on" }).select("*").single();
    if (created.error) throw new Error(`Unable to create layout: ${created.error.message}`);
    layout = created.data;
  }
  const current = await db.from("section_columns").select("*").eq("section_layout_id", layout.id).eq("section_id", sectionId).order("sort_order");
  if (current.error) throw new Error(`Unable to load columns: ${current.error.message}`);
  const extras = (current.data ?? []).slice(count);
  if (extras.length) {
    const used = await db.from("content_blocks").select("column_id").in("column_id", extras.map((column) => column.id));
    if (used.error) throw new Error(`Unable to verify Column contents: ${used.error.message}`);
    const populated = new Set((used.data ?? []).map((block) => block.column_id));
    const blockedColumns = extras.filter((column) => populated.has(column.id)).map((column) => column.label || column.column_key);
    if (blockedColumns.length) throw new Error(`The layout cannot remove populated Columns: ${blockedColumns.join(", ")}. Move or delete their Blocks first.`);
    const removed = await db.from("section_columns").delete().in("id", extras.map((column) => column.id)).eq("section_id", sectionId);
    if (removed.error) throw new Error(`Unable to remove empty columns: ${removed.error.message}`);
  }
  const retained = (current.data ?? []).slice(0, count);
  const reservedKeys = new Set(retained.map((column) => column.column_key));
  for (let index = 0; index < count; index += 1) {
    const existing = retained[index];
    if (existing) {
      const update = await db.from("section_columns").update({ sort_order: index, mobile_order: index, width_percent: selectedWidths[index] }).eq("id", existing.id).eq("section_layout_id", layout.id).eq("section_id", sectionId);
      if (update.error) throw new Error(`Unable to update column: ${update.error.message}`);
    } else {
      const generatedKey = [columnKey(index, count), ...KEYS].find((key) => !reservedKeys.has(key));
      if (!generatedKey) throw new Error("Unable to generate a stable Column key.");
      reservedKeys.add(generatedKey);
      const create = await db.from("section_columns").insert({ section_layout_id: layout.id, section_id: sectionId, column_key: generatedKey, sort_order: index, mobile_order: index, width_percent: selectedWidths[index] });
      if (create.error) throw new Error(`Unable to create column: ${create.error.message}`);
    }
  }
  const changed = await db.from("section_layouts").update({ layout_mode: mode, participant_resizing_enabled: form.get("participant_resizing_enabled") === "on" }).eq("id", layout.id).eq("section_id", sectionId);
  if (changed.error) throw new Error(`Unable to update layout: ${changed.error.message}`);
  await audit(admin, existingLayout.data ? existingLayout.data.layout_mode === mode ? "section.layout.updated" : "section.layout.mode_changed" : "section.layout.created", "experience_section", sectionId, { experienceId, versionId, layoutMode: mode });
}

function asValidatedColumn(row: Tables<"section_columns">, form: FormData, index: number): SectionColumn {
  const behavior = String(form.get(`mobile_behavior_${row.id}`));
  if (!MOBILE.has(behavior as MobileColumnBehavior)) throw new Error("Invalid mobile behavior.");
  const collapsible = form.get(`collapsible_${row.id}`) === "on";
  const label = String(form.get(`label_${row.id}`) ?? "").trim();
  if (label.length > 120) throw new Error("Column labels must be 120 characters or fewer.");
  return { ...row, label: label || null, width_percent: Number(form.get(`width_${row.id}`)), sort_order: index, sticky: form.get(`sticky_${row.id}`) === "on", collapsible, default_collapsed: form.get(`default_collapsed_${row.id}`) === "on", mobile_order: Number(form.get(`mobile_order_${row.id}`)), mobile_behavior: behavior as MobileColumnBehavior };
}

export async function updateSectionColumns(experienceId: string, versionId: string, sectionId: string, form: FormData) {
  const { admin, db } = await authorized(experienceId, versionId, sectionId);
  const layout = await db.from("section_layouts").select("*").eq("section_id", sectionId).maybeSingle();
  if (!layout.data) throw new Error("Create the Section layout first.");
  const rows = await db.from("section_columns").select("*").eq("section_layout_id", layout.data.id).eq("section_id", sectionId).order("sort_order");
  if (rows.error) throw new Error(`Unable to load columns: ${rows.error.message}`);
  const columns = (rows.data ?? []).map((row, index) => asValidatedColumn(row, form, index));
  const validation = validateSectionLayout(layout.data.layout_mode as LayoutMode, columns);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  for (const column of columns) {
    const result = await db.from("section_columns").update({ label: column.label, width_percent: column.width_percent, sticky: column.sticky, collapsible: column.collapsible, default_collapsed: column.default_collapsed, mobile_order: column.mobile_order, mobile_behavior: column.mobile_behavior }).eq("id", column.id).eq("section_layout_id", layout.data.id).eq("section_id", sectionId);
    if (result.error) throw new Error(`Unable to update column: ${result.error.message}`);
  }
  const layoutUpdate = await db.from("section_layouts").update({ participant_resizing_enabled: form.get("participant_resizing_enabled") === "on" }).eq("id", layout.data.id).eq("section_id", sectionId);
  if (layoutUpdate.error) throw new Error(`Unable to update participant resizing: ${layoutUpdate.error.message}`);
  await audit(admin, "section.column.updated", "experience_section", sectionId, { experienceId, versionId, columnCount: columns.length });
}

export async function moveSectionColumn(experienceId: string, versionId: string, sectionId: string, columnId: string, direction: "left" | "right") {
  const { admin, db } = await authorized(experienceId, versionId, sectionId);
  const layout = await db.from("section_layouts").select("id").eq("section_id", sectionId).maybeSingle();
  if (!layout.data) throw new Error("Layout not found.");
  const columns = await db.from("section_columns").select("id,sort_order").eq("section_layout_id", layout.data.id).eq("section_id", sectionId).order("sort_order");
  if (columns.error) throw new Error("Unable to load columns.");
  const index = (columns.data ?? []).findIndex((column) => column.id === columnId);
  const target = index + (direction === "left" ? -1 : 1);
  if (index < 0 || target < 0 || target >= (columns.data ?? []).length) return;
  const other = columns.data![target];
  const temporary = -1000 - index;
  for (const [id, order] of [[columnId, temporary], [other.id, index], [columnId, target]] as const) {
    const result = await db.from("section_columns").update({ sort_order: order }).eq("id", id).eq("section_layout_id", layout.data.id).eq("section_id", sectionId);
    if (result.error) throw new Error(`Unable to reorder column: ${result.error.message}`);
  }
  await audit(admin, "section.column.reordered", "experience_section", sectionId, { experienceId, versionId, columnId, direction });
}
