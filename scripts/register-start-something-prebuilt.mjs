import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const EXPERIENCE_ID = "8ccd1802-f9c2-493d-bcc8-73885008096b";
const LAUNCH_PATH = "/experiences/start-something";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  throw new Error("Load an explicitly authorized environment before inspecting Start Something.");
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
);

const [experience, registry] = await Promise.all([
  db.from("experiences")
    .select("id,slug,name,experience_type,delivery_mode,status,visibility,admission_policy,current_published_version_id")
    .eq("id", EXPERIENCE_ID)
    .maybeSingle(),
  db.from("prebuilt_assessments")
    .select("experience_id,launch_path,completion_provider,status")
    .eq("experience_id", EXPERIENCE_ID)
    .maybeSingle(),
]);

if (experience.error || registry.error) {
  throw new Error("Unable to inspect the Start Something release state.");
}
if (!experience.data || experience.data.slug !== "start-something") {
  throw new Error("The reserved Start Something Experience is unavailable.");
}
if (
  experience.data.experience_type !== "assessment"
  || experience.data.delivery_mode !== "builder"
) {
  throw new Error("Start Something does not match the expected native Assessment identity.");
}

const currentVersionId = experience.data.current_published_version_id;
const version = currentVersionId
  ? await db.from("experience_versions")
    .select("id,experience_id,status,published_at")
    .eq("id", currentVersionId)
    .eq("experience_id", EXPERIENCE_ID)
    .maybeSingle()
  : { data: null, error: null };
if (version.error) throw new Error("Unable to inspect the current Start Something Version.");
const published = Boolean(currentVersionId && version.data?.status === "published");
const lessons = currentVersionId ? await db.from("experience_lessons")
  .select("id")
  .eq("experience_version_id", currentVersionId) : { data: [], error: null };
if (lessons.error || lessons.data.length !== 1) {
  throw new Error("The current Published Version does not contain the expected single Start Something Lesson.");
}
const block = await db.from("content_blocks")
  .select("id,lesson_id,section_id,column_id,block_type,custom_renderer_key,status,visibility,completion_rule")
  .eq("lesson_id", lessons.data[0].id)
  .eq("custom_renderer_key", "start-something.v1")
  .eq("block_type", "custom_component")
  .eq("status", "active")
  .eq("visibility", "visible")
  .maybeSingle();
if (block.error || !block.data?.section_id || !block.data.column_id || block.data.completion_rule !== "response_submitted") {
  throw new Error("The current Published Version does not contain one valid rendered Start Something Block.");
}
const definition = await db.from("response_definitions")
  .select("id")
  .eq("experience_version_id", currentVersionId)
  .eq("block_id", block.data.id)
  .eq("lesson_id", block.data.lesson_id)
  .eq("response_key", "start_something")
  .eq("response_type", "structured_response")
  .eq("is_required", true)
  .maybeSingle();
if (definition.error || !definition.data) {
  throw new Error("The current Published Version does not contain the required Start Something response definition.");
}
const registryAligned = registry.data?.launch_path === LAUNCH_PATH
  && registry.data.completion_provider === "experience_enrollment"
  && registry.data.status === "active";
const standaloneAligned = experience.data.status === "active"
  && experience.data.visibility === "public"
  && experience.data.admission_policy === "open_enrollment";

console.log(JSON.stringify({
  mode: APPLY ? "apply" : "dry-run",
  experienceId: EXPERIENCE_ID,
  versionId: currentVersionId,
  published,
  standaloneAligned,
  registryAligned,
  launchPath: LAUNCH_PATH,
}, null, 2));

if (!APPLY || (standaloneAligned && registryAligned)) process.exit(0);
if (process.argv.find((argument) => argument.startsWith("--confirm=")) !== `--confirm=${EXPERIENCE_ID}`) {
  throw new Error(`Apply requires --confirm=${EXPERIENCE_ID}`);
}
if (!published) {
  throw new Error("Publish the verified Draft through the authorized Builder workflow before activating standalone and reusable availability.");
}

const activated = await db.from("experiences")
  .update({ status: "active", visibility: "public", admission_policy: "open_enrollment" })
  .eq("id", EXPERIENCE_ID)
  .eq("current_published_version_id", currentVersionId)
  .eq("experience_type", "assessment")
  .select("id")
  .maybeSingle();
if (activated.error || !activated.data) {
  throw new Error("Start Something changed during activation; no registry change was attempted.");
}

const registered = await db.from("prebuilt_assessments").upsert({
  experience_id: EXPERIENCE_ID,
  launch_path: LAUNCH_PATH,
  completion_provider: "experience_enrollment",
  status: "active",
  updated_at: new Date().toISOString(),
}, { onConflict: "experience_id" });
if (registered.error) {
  throw new Error(`Standalone activation succeeded, but reusable registration failed: ${registered.error.message}`);
}

const verified = await Promise.all([
  db.from("experiences")
    .select("status,visibility,admission_policy,current_published_version_id")
    .eq("id", EXPERIENCE_ID)
    .single(),
  db.from("prebuilt_assessments")
    .select("launch_path,completion_provider,status")
    .eq("experience_id", EXPERIENCE_ID)
    .single(),
]);
if (
  verified.some((result) => result.error)
  || verified[0].data.current_published_version_id !== currentVersionId
  || verified[0].data.status !== "active"
  || verified[0].data.visibility !== "public"
  || verified[0].data.admission_policy !== "open_enrollment"
  || verified[1].data.launch_path !== LAUNCH_PATH
  || verified[1].data.completion_provider !== "experience_enrollment"
  || verified[1].data.status !== "active"
) {
  throw new Error("Post-registration verification failed. Review the live release state.");
}

console.log(JSON.stringify({ applied: true, standalone: true, reusablePrebuiltAssessment: true }, null, 2));
