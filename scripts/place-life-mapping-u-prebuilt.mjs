import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const EXPERIENCE_ID = "cfa2f5cb-1546-4041-af1b-00196d605610";
const VERSION_ID = "1954f23f-3690-4264-b56f-7179ac46db43";
const PUBLISHED_VERSION_ID = "35f0f44e-0c5e-43c0-8568-2c336a1de460";
const SECTION_ID = "3215c464-3bfd-4714-a0a6-d01002d91d3c";
const ASSESSMENT_EXPERIENCE_ID = "5951336e-f419-455e-93b0-8fe075a5a86d";
const BLOCK_KEY = "life-mapping-u-assessment";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  throw new Error("Load .env.local so the Hub Leader Cohort Draft can be inspected.");
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
);

const experience = await db
  .from("experiences")
  .select("id,current_published_version_id")
  .eq("id", EXPERIENCE_ID)
  .single();
if (experience.error || experience.data?.current_published_version_id !== PUBLISHED_VERSION_ID) {
  throw new Error("The Hub Leader Cohort Published version has changed. Re-audit the Draft before placement.");
}

const version = await db
  .from("experience_versions")
  .select("id,experience_id,status,based_on_version_id")
  .eq("id", VERSION_ID)
  .eq("experience_id", EXPERIENCE_ID)
  .single();
if (
  version.error
  || version.data?.status !== "draft"
  || version.data.based_on_version_id !== PUBLISHED_VERSION_ID
) {
  throw new Error("The expected Hub Leader Cohort Draft is unavailable or no longer based on the current Published version.");
}

const section = await db
  .from("experience_sections")
  .select("id,lesson_id,title,experience_version_id")
  .eq("id", SECTION_ID)
  .eq("experience_version_id", VERSION_ID)
  .single();
if (section.error || section.data?.title !== "Complete Life Mapping U") {
  throw new Error("The expected Week 9 Complete Life Mapping U page is unavailable.");
}

const registry = await db
  .from("prebuilt_assessments")
  .select("experience_id,status,completion_provider,launch_path")
  .eq("experience_id", ASSESSMENT_EXPERIENCE_ID)
  .eq("status", "active")
  .maybeSingle();
if (registry.error || registry.data?.completion_provider !== "lmu_assessment") {
  throw new Error("Life Mapping U is not registered with its active LMU completion provider.");
}

const assessment = await db
  .from("experiences")
  .select("id,name,description,experience_type,status")
  .eq("id", ASSESSMENT_EXPERIENCE_ID)
  .eq("experience_type", "assessment")
  .eq("status", "active")
  .maybeSingle();
if (assessment.error || !assessment.data) {
  throw new Error("The canonical Life Mapping U Assessment is unavailable.");
}

const lessonBlocksResult = await db
  .from("content_blocks")
  .select("id,section_id,column_id,block_key,block_type,sort_order,content,requirement_level,completion_rule")
  .eq("lesson_id", section.data.lesson_id);
if (lessonBlocksResult.error) {
  throw new Error(`Unable to inspect Life Mapping U Lesson Blocks: ${lessonBlocksResult.error.message}`);
}

const lessonBlocks = [...lessonBlocksResult.data].sort((left, right) => left.sort_order - right.sort_order);
const pageBlocks = lessonBlocks.filter((block) => block.section_id === SECTION_ID);
const introduction = pageBlocks.find((block) => block.block_type === "rich_text");
const followingContent = pageBlocks.find((block) => {
  const content = block.content && typeof block.content === "object" && !Array.isArray(block.content)
    ? block.content
    : {};
  const isPlacedAssessment = block.block_key === BLOCK_KEY
    || (block.block_type === "prebuilt_assessment" && content.assessmentExperienceId === ASSESSMENT_EXPERIENCE_ID);
  return block.sort_order > (introduction?.sort_order ?? Number.MAX_SAFE_INTEGER) && !isPlacedAssessment;
});
if (!introduction?.column_id || !followingContent || followingContent.column_id !== introduction.column_id) {
  throw new Error("Expected an introduction followed by existing content in the same rendered Column.");
}

const existing = lessonBlocks.find((block) => {
  const content = block.content && typeof block.content === "object" && !Array.isArray(block.content)
    ? block.content
    : {};
  return block.block_key === BLOCK_KEY
    || (block.block_type === "prebuilt_assessment" && content.assessmentExperienceId === ASSESSMENT_EXPERIENCE_ID);
});

console.log(JSON.stringify({
  apply: APPLY,
  versionId: VERSION_ID,
  versionStatus: version.data.status,
  section: section.data.title,
  existingAssessmentBlockId: existing?.id ?? null,
  placement: "after the introduction and before the existing external course link",
  introductionId: introduction.id,
  followingContentId: followingContent.id,
  completionProvider: registry.data.completion_provider,
  requirementLevel: "required",
}, null, 2));

if (!APPLY || existing) process.exit(0);

const maximum = Math.max(...lessonBlocks.map((block) => block.sort_order));
const inserted = await db
  .from("content_blocks")
  .insert({
    lesson_id: section.data.lesson_id,
    section_id: SECTION_ID,
    column_id: introduction.column_id,
    block_key: BLOCK_KEY,
    block_type: "prebuilt_assessment",
    sort_order: maximum + 1,
    content: {
      assessmentExperienceId: ASSESSMENT_EXPERIENCE_ID,
      title: assessment.data.name,
      description: assessment.data.description ?? "",
    },
    settings: {},
    requirement_level: "required",
    status: "active",
    visibility: "visible",
    completion_rule: "interaction",
    custom_renderer_key: null,
    metadata: {},
  })
  .select("id")
  .single();
if (inserted.error) {
  throw new Error(`Unable to create the Life Mapping U Prebuilt Assessment Block: ${inserted.error.message}`);
}

const currentIds = lessonBlocks.map((block) => block.id);
const introductionIndex = currentIds.indexOf(introduction.id);
const desiredIds = [
  ...currentIds.slice(0, introductionIndex + 1),
  inserted.data.id,
  ...currentIds.slice(introductionIndex + 1),
];
const slots = [...lessonBlocks.map((block) => block.sort_order), maximum + 1].sort((left, right) => left - right);
const temporaryOffset = maximum + slots.length + 100;

for (const [index, id] of desiredIds.entries()) {
  const moved = await db
    .from("content_blocks")
    .update({ sort_order: temporaryOffset + index })
    .eq("id", id)
    .eq("lesson_id", section.data.lesson_id);
  if (moved.error) throw new Error(`Unable to prepare Life Mapping U Block order: ${moved.error.message}`);
}
for (const [index, id] of desiredIds.entries()) {
  const moved = await db
    .from("content_blocks")
    .update({ sort_order: slots[index] })
    .eq("id", id)
    .eq("lesson_id", section.data.lesson_id);
  if (moved.error) throw new Error(`Unable to save Life Mapping U Block order: ${moved.error.message}`);
}

const loaded = await db
  .from("content_blocks")
  .select("id,section_id,column_id,block_key,block_type,sort_order,content,requirement_level,status,visibility,completion_rule,custom_renderer_key")
  .eq("section_id", SECTION_ID);
if (loaded.error) throw new Error(`Builder-equivalent Block load failed: ${loaded.error.message}`);

const ordered = [...loaded.data].sort((left, right) => left.sort_order - right.sort_order);
const matches = ordered.filter((block) => {
  const content = block.content && typeof block.content === "object" && !Array.isArray(block.content)
    ? block.content
    : {};
  return block.block_type === "prebuilt_assessment"
    && content.assessmentExperienceId === ASSESSMENT_EXPERIENCE_ID;
});
const placedIndex = ordered.findIndex((block) => block.id === inserted.data.id);
if (
  matches.length !== 1
  || ordered[placedIndex - 1]?.id !== introduction.id
  || ordered[placedIndex + 1]?.id !== followingContent.id
  || matches[0].requirement_level !== "required"
  || matches[0].completion_rule !== "interaction"
) {
  throw new Error("Post-placement verification failed.");
}

console.log(JSON.stringify({
  applied: true,
  blockId: inserted.data.id,
  builderLoadCount: matches.length,
  pageOrder: ordered.map((block) => ({
    id: block.id,
    blockType: block.block_type,
    sortOrder: block.sort_order,
  })),
}, null, 2));
