import type {
  BuilderContentBlock,
  ExperienceLessonRecord,
  ExperienceSection,
  LayoutMode,
  MobileColumnBehavior,
  SectionColumn,
  ValidationResult,
} from "./types";

const COLUMN_COUNT: Record<LayoutMode, number> = {
  single_column: 1,
  two_column: 2,
  three_column: 3,
};

const MOBILE_BEHAVIORS = new Set<MobileColumnBehavior>(["stack", "collapsible", "hidden"]);
const WIDTH_TOLERANCE = 0.01;

export function validateSectionLayout(layoutMode: LayoutMode, columns: readonly SectionColumn[]): ValidationResult<readonly SectionColumn[]> {
  const errors: string[] = [];
  const expectedCount = COLUMN_COUNT[layoutMode];
  if (columns.length !== expectedCount) errors.push(`${layoutMode} requires exactly ${expectedCount} column${expectedCount === 1 ? "" : "s"}.`);

  const keys = new Set<string>();
  const sortOrders = new Set<number>();
  const mobileOrders = new Set<number>();
  let width = 0;
  for (const column of columns) {
    if (!Number.isFinite(column.width_percent) || column.width_percent <= 0 || column.width_percent >= 100 && expectedCount > 1) errors.push(`${column.column_key} requires a sensible positive width.`);
    if (keys.has(column.column_key)) errors.push(`Duplicate column_key: ${column.column_key}.`);
    keys.add(column.column_key);
    if (sortOrders.has(column.sort_order)) errors.push(`Duplicate column sort_order: ${column.sort_order}.`);
    sortOrders.add(column.sort_order);
    if (mobileOrders.has(column.mobile_order)) errors.push(`Duplicate mobile_order: ${column.mobile_order}.`);
    mobileOrders.add(column.mobile_order);
    if (!MOBILE_BEHAVIORS.has(column.mobile_behavior)) errors.push(`Unsupported mobile behavior for ${column.column_key}.`);
    if (column.default_collapsed && !column.collapsible) errors.push(`${column.column_key} cannot default to collapsed unless it is collapsible.`);
    width += column.width_percent;
  }
  if (Math.abs(width - 100) > WIDTH_TOLERANCE) errors.push(`Column widths must total 100%; received ${width}.`);
  return errors.length ? { ok: false, errors } : { ok: true, value: columns };
}

export function validateBuilderBlockPlacement({ block, section, lesson, columns }: {
  block: Pick<BuilderContentBlock, "lesson_id" | "section_id" | "column_id" | "block_key">;
  section: Pick<ExperienceSection, "id" | "lesson_id" | "experience_version_id">;
  lesson?: Pick<ExperienceLessonRecord, "id" | "experience_version_id">;
  columns: readonly Pick<SectionColumn, "id" | "section_id">[];
}): ValidationResult<typeof block> {
  const errors: string[] = [];
  if (!block.lesson_id) errors.push("A builder block requires lesson_id.");
  if (!block.section_id) errors.push("A builder block requires section_id.");
  if (!block.column_id) errors.push("A builder block requires column_id.");
  if (!block.block_key.trim()) errors.push("A builder block requires block_key.");
  if (block.lesson_id !== section.lesson_id) errors.push("The selected Section does not belong to the block's Lesson.");
  if (lesson && (lesson.id !== section.lesson_id || lesson.experience_version_id !== section.experience_version_id)) {
    errors.push("The selected Section does not belong to the selected Lesson and Version.");
  }
  if (block.section_id !== section.id) errors.push("The selected Section does not match section_id.");
  const column = columns.find((candidate) => candidate.id === block.column_id);
  if (!column) errors.push("The selected Column is not part of the Section layout.");
  else if (column.section_id !== section.id) errors.push("The selected Column belongs to another Section.");
  return errors.length ? { ok: false, errors } : { ok: true, value: block };
}

export function assertVersionEditable(status: string): asserts status is "draft" {
  if (status !== "draft") throw new Error(`Experience version is ${status} and cannot be edited. Clone it into a draft first.`);
}
