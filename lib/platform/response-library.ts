import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getPlatformUser } from "./auth";
import { canAccessCohortContext, getAuthorizationContext } from "./authorization";
import { needsExperiencePassword } from "@/lib/experiences/access/server";
import { getExperienceStructure } from "@/lib/experiences/builder/data";
import { effectiveDeliveryStructure } from "@/lib/experiences/builder/participant-runtime";
import { parsePrebuiltAssessmentConfiguration } from "@/lib/experiences/builder/prebuilt-assessment";
import type { Tables } from "@/lib/supabase/database.types";
import { activityResultItems, activityResponseItems, canReviewMemberResponses, isAssessmentActivity, readableResponseFields, weekTitle, type ResponseCourse, type ResponseLibraryData, type SavedActivity } from "./response-library-policy";

type Enrollment = Tables<"experience_enrollments">;
type Offering = Tables<"experience_offerings">;
const dbClient = createAdminSupabaseClient;
export class ResponseLibraryAccessError extends Error { constructor(public status: number) { super("Saved responses are unavailable."); } }

async function lmuActivities(participantId: string, assessmentId?: string | null): Promise<SavedActivity[]> {
  const db = dbClient();
  let query = db.from("lmu_assessments").select("id,status,started_at,completed_at").eq("participant_id", participantId).in("status", ["in_progress", "completed"]);
  if (assessmentId) query = query.eq("id", assessmentId);
  const assessments = await query.order("started_at", { ascending: false });
  if (assessments.error) throw new Error("Unable to load Life Mapping U responses.");
  const ids = (assessments.data ?? []).map((assessment) => assessment.id);
  if (!ids.length) return [];
  const [responses, results] = await Promise.all([
    db.from("lmu_responses").select("assessment_id,section_key,response_data").in("assessment_id", ids),
    db.from("lmu_results").select("assessment_id,section_key,result_data").in("assessment_id", ids),
  ]);
  if (responses.error || results.error) throw new Error("Unable to load Life Mapping U submissions.");
  const activities: SavedActivity[] = [];
  for (const assessment of assessments.data ?? []) {
    const items = (responses.data ?? []).filter((row) => row.assessment_id === assessment.id).flatMap((row) => readableResponseFields(row.response_data, row.section_key.replaceAll("_", " ")));
    const discoveries = (results.data ?? []).filter((row) => row.assessment_id === assessment.id).flatMap((row) => readableResponseFields(row.result_data, `${row.section_key.replaceAll("_", " ")} · Finalized results`));
    if (items.length || discoveries.length) activities.push({ id: assessment.id, title: "Life Mapping U", location: assessment.started_at, assessment: true, status: assessment.status, updatedAt: assessment.completed_at ?? assessment.started_at, items, results: discoveries });
  }
  return activities;
}

async function enrollmentVersions(participantId: string, enrollment: Enrollment) {
  const db = dbClient();
  const [history, responses] = await Promise.all([
    db.from("experience_enrollment_version_history").select("experience_version_id,artifact_snapshot:artifact_snapshot->removed_responses").eq("participant_id", participantId).eq("enrollment_id", enrollment.id).eq("experience_id", enrollment.experience_id),
    db.from("participant_responses").select("experience_version_id").eq("participant_id", participantId).eq("enrollment_id", enrollment.id),
  ]);
  if (history.error || responses.error) throw new Error("Unable to load saved response history.");
  const savedVersions = new Set((responses.data ?? []).map((row) => row.experience_version_id));
  const retained = (history.data ?? []).filter((row) => {
    const snapshot = row.artifact_snapshot as { removed_responses?: unknown[] } | null;
    return savedVersions.has(row.experience_version_id) || Boolean(Array.isArray(snapshot) ? snapshot.length : snapshot?.removed_responses?.length);
  });
  // Publishing creates history even when no responses were saved in that draft.
  // Skip those empty structures while retaining the current version and saved work.
  return [...new Set([enrollment.experience_version_id, ...retained.map((row) => row.experience_version_id)].filter((id): id is string => Boolean(id)))];
}

// Discover saved versions without transferring participant answer payloads.
async function responseVersionIds(participantId: string, enrollment: Enrollment) {
  const db = dbClient();
  const [responses, archived] = await Promise.all([
    db.from("participant_responses").select("experience_version_id").eq("participant_id", participantId).eq("enrollment_id", enrollment.id),
    db.from("experience_enrollment_version_history").select("experience_version_id").eq("participant_id", participantId).eq("enrollment_id", enrollment.id).eq("experience_id", enrollment.experience_id).not("artifact_snapshot->removed_responses", "is", null).neq("artifact_snapshot->removed_responses", "[]"),
  ]);
  if (responses.error || archived.error) throw new Error("Unable to load saved response versions.");
  return [...new Set([enrollment.experience_version_id, ...(responses.data ?? []).map((row) => row.experience_version_id), ...(archived.data ?? []).map((row) => row.experience_version_id)].filter((id): id is string => Boolean(id)))];
}
type ResponseRequest = { outline?: boolean; box?: string };

// Keep deduplication inside one authorized request; never share participant data
// or password decisions between viewers.
function responseLoadContext(includeUnanswered = false, request: ResponseRequest = {}) {
  const passwords = new Map<string, Promise<boolean>>();
  const assessments = new Map<string, Promise<Pick<Tables<"experiences">, "id" | "name" | "slug" | "current_published_version_id"> | null>>();
  const linkedCourses = new Map<string, Promise<ResponseCourse[]>>();
  const structures = new Map<string, ReturnType<typeof getExperienceStructure>>();
  return {
    linkedCourses,
    includeUnanswered,
    request,
    structure(experienceId: string, versionId: string) {
      const key = `${experienceId}:${versionId}`;
      let pending = structures.get(key);
      if (!pending) {
        pending = (async () => {
          if (!request.outline && !request.box) return getExperienceStructure(experienceId, versionId, dbClient());
          const definitions = await dbClient().from("response_definitions").select("block_id").eq("experience_version_id", versionId);
          if (definitions.error) throw new Error("Unable to load question locations.");
          return getExperienceStructure(experienceId, versionId, dbClient(), (definitions.data ?? []).map((row) => row.block_id).filter((id): id is string => Boolean(id)));
        })();
        structures.set(key, pending);
      }
      return pending;
    },
    assessment(experienceId: string) {
      let pending = assessments.get(experienceId);
      if (!pending) {
        pending = (async () => {
          const result = await dbClient().from("experiences").select("id,name,slug,current_published_version_id").eq("id", experienceId).eq("experience_type", "assessment").maybeSingle();
          if (result.error) throw new Error("Unable to resolve the linked assessment.");
          return result.data;
        })();
        assessments.set(experienceId, pending);
      }
      return pending;
    },
    passwordRequired(experienceId: string) {
      let pending = passwords.get(experienceId);
      if (!pending) { pending = needsExperiencePassword(experienceId); passwords.set(experienceId, pending); }
      return pending;
    },
  };
}
type ResponseLoadContext = ReturnType<typeof responseLoadContext>;

async function loadCourse(participantId: string, enrollment: Pick<Enrollment, "experience_id"> & { id: string | null }, versionId: string, offering: Offering | null = null, linked = false, context: ResponseLoadContext = responseLoadContext()): Promise<ResponseCourse> {
  const db = dbClient();
  // Callers select this enrollment with participant_id and authorize the requested version.
  const [canonical, locked] = await Promise.all([
    context.structure(enrollment.experience_id, versionId),
    context.passwordRequired(enrollment.experience_id),
  ]);
  const href = `/experiences/${encodeURIComponent(canonical.experience.slug)}`;
  const course: ResponseCourse = { id: `${enrollment.id ?? enrollment.experience_id}:${versionId}`, title: canonical.experience.name, version: canonical.version.version_label, weeks: [], href };
  if (locked) return { ...course, locked: true };
  const [structure, definitions] = await Promise.all([
    effectiveDeliveryStructure(canonical, offering, db),
    db.from("response_definitions").select("id,block_id,response_key,label,configuration").eq("experience_version_id", versionId),
  ]);
  if (definitions.error) throw new Error("Unable to load course questions.");
  const definitionsByBlock = new Map((definitions.data ?? []).map((row) => [row.block_id, row]));
  const boxKey = (moduleId: string, blockId: string, assessment: boolean) => `${versionId}:${assessment ? "assessment" : "questions"}:${assessment ? blockId : moduleId}`;
  const selected = (moduleId: string, blockId: string, assessment: boolean) => linked || !context.request.box || context.request.box === boxKey(moduleId, blockId, assessment);
  const selectedIds = structure.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.sections.flatMap((section) => (section.layout?.columns ?? []).flatMap((column) => column.blocks.flatMap((block) => {
    const definition = definitionsByBlock.get(block.id);
    return definition && selected(module.id, block.id, isAssessmentActivity(definition.response_key, block.block_type, block.custom_renderer_key, structure.experience.experience_type)) ? [definition.id] : [];
  })))));
  const readResponses = !context.request.outline && enrollment.id && selectedIds.length > 0;
  const [responses, history] = await Promise.all([
    readResponses ? db.from("participant_responses").select("*").eq("participant_id", participantId).eq("enrollment_id", enrollment.id!).eq("experience_version_id", versionId).in("response_definition_id", selectedIds).order("updated_at", { ascending: false }) : { data: [], error: null },
    readResponses ? db.from("experience_enrollment_version_history").select("id,artifact_snapshot:artifact_snapshot->removed_responses,ended_at").eq("participant_id", participantId).eq("enrollment_id", enrollment.id!).eq("experience_id", enrollment.experience_id).eq("experience_version_id", versionId) : { data: [], error: null },
  ]);
  if (responses.error || history.error) throw new Error("Unable to load saved course responses.");
  const responsesByDefinition = new Map((responses.data ?? []).map((row) => [row.response_definition_id, row]));
  for (const archived of history.data ?? []) {
    if (!enrollment.id) continue;
    const snapshot = archived.artifact_snapshot as { removed_responses?: Array<{ response_definition_id: string; response_data: Tables<"participant_responses">["response_data"]; status: string; finalized_at: string | null }> };
    for (const saved of (Array.isArray(snapshot) ? snapshot : snapshot?.removed_responses) ?? []) if (!responsesByDefinition.has(saved.response_definition_id)) responsesByDefinition.set(saved.response_definition_id, { ...saved, id: `history:${archived.id}:${saved.response_definition_id}`, participant_id: participantId, enrollment_id: enrollment.id, experience_version_id: versionId, updated_at: saved.finalized_at ?? archived.ended_at ?? "", created_at: archived.ended_at ?? "" });
  }
  for (const [index, module] of structure.modules.entries()) {
    const week = { id: module.id, title: weekTitle(module.title, index, structure.experience.experience_type === "assessment"), activities: [] as SavedActivity[] };
    for (const lesson of module.lessons) for (const section of lesson.sections) for (const column of section.layout?.columns ?? []) for (const block of column.blocks) {
      const definition = definitionsByBlock.get(block.id), response = definition ? responsesByDefinition.get(definition.id) : null;
      const location = [lesson.title, section.title].filter(Boolean).join(" · ");
      const assessment = definition ? isAssessmentActivity(definition.response_key, block.block_type, block.custom_renderer_key, structure.experience.experience_type) : true;
      if (!selected(module.id, block.id, assessment)) continue;
      if (context.request.outline) {
        if (definition) week.activities.push({ id: definition.id, title: definition.label, location, assessment, status: "", updatedAt: "", items: [], loadKey: boxKey(module.id, block.id, assessment) });
        if (!linked && block.block_type === "prebuilt_assessment") {
          const parsed = parsePrebuiltAssessmentConfiguration(block.configuration);
          if (parsed.ok) week.activities.push({ id: block.id, title: parsed.value.title || "Assessment", location, assessment: true, status: "", updatedAt: "", items: [], loadKey: boxKey(module.id, block.id, true) });
        }
        continue;
      }
      if (definition && (response || context.includeUnanswered)) {
        const items = activityResponseItems(definition.response_key, response?.response_data, definition.configuration, context.includeUnanswered).map((item) => ({ ...item, question: item.question || definition.label }));
        if (items.length) week.activities.push({ id: response?.id ?? definition.id, title: definition.label, location, assessment: isAssessmentActivity(definition.response_key, block.block_type, block.custom_renderer_key, structure.experience.experience_type), status: response?.status ?? "not_started", updatedAt: response?.finalized_at ?? response?.updated_at ?? "", items, results: activityResultItems(definition.response_key, response?.response_data, response?.status ?? "not_started", response?.finalized_at ?? null) });
      }
      if (linked || block.block_type !== "prebuilt_assessment") continue;
      const parsed = parsePrebuiltAssessmentConfiguration(block.configuration);
      if (!parsed.ok) continue;
      const childExperience = await context.assessment(parsed.value.assessmentExperienceId);
      if (!childExperience) continue;
      const childTitle = parsed.value.title || childExperience.name;
      if (await context.passwordRequired(childExperience.id)) {
        week.activities.push({ id: block.id, title: childTitle, location, assessment: true, status: "locked", updatedAt: "", items: [], locked: true, href: `/experiences/${childExperience.slug}` });
        continue;
      }
      if (childExperience.slug === "life-mapping-u") {
        const attempt = enrollment.id ? await db.from("embedded_assessment_attempts").select("provider_attempt_id").eq("participant_id", participantId).eq("parent_enrollment_id", enrollment.id).eq("parent_content_block_id", block.id).eq("assessment_experience_id", childExperience.id).maybeSingle() : { data: null, error: null };
        if (attempt.error) throw new Error("Unable to load the linked Life Mapping U attempt.");
        week.activities.push(...(attempt.data?.provider_attempt_id ? await lmuActivities(participantId, attempt.data.provider_attempt_id) : []).map((activity) => ({ ...activity, id: `${block.id}:${activity.id}`, title: childTitle, location })));
        continue;
      }
      const childKey = `${participantId}:${childExperience.id}`;
      let pending = context.linkedCourses.get(childKey);
      if (!pending) {
        const childId = childExperience.id;
        pending = (async () => {
          const child = await db.from("experience_enrollments").select("*").eq("participant_id", participantId).eq("experience_id", childId).maybeSingle();
          if (child.error) throw new Error("Unable to load the linked assessment enrollment.");
          if (!child.data) {
            const versionId = childExperience.current_published_version_id;
            return context.includeUnanswered && versionId ? [await loadCourse(participantId, { id: null, experience_id: childId }, versionId, null, true, context)] : [];
          }
          const childEnrollment = child.data;
          const versions = context.request.box ? await responseVersionIds(participantId, childEnrollment) : await enrollmentVersions(participantId, childEnrollment);
          return Promise.all(versions.map((version) => loadCourse(participantId, childEnrollment, version, null, true, context)));
        })();
        context.linkedCourses.set(childKey, pending);
      }
      for (const saved of await pending) {
        for (const activity of saved.weeks.flatMap((group) => group.activities)) week.activities.push({ ...activity, id: `${block.id}:${activity.id}`, title: childTitle, location: `${location} · ${saved.version}`, assessment: true });
      }
    }
    // Empty weeks remain visible so the course chronology is clear.
    course.weeks.push(week);
  }
  return course;
}

export async function loadCohortMemberResponses(cohortId: string, participantId: string, request: ResponseRequest = {}): Promise<ResponseLibraryData> {
  const user = await getPlatformUser();
  if (!user) throw new ResponseLibraryAccessError(401);
  const db = dbClient();
  const [authorization, viewer, cohort, member] = await Promise.all([
    getAuthorizationContext(user.id, user.email),
    db.from("participants").select("id").eq("auth_user_id", user.id).maybeSingle(),
    db.from("cohorts").select("id,experience_id,status").eq("id", cohortId).maybeSingle(),
    db.from("cohort_memberships").select("participant_id").eq("cohort_id", cohortId).eq("participant_id", participantId).eq("status", "active").limit(1).maybeSingle(),
  ]);
  if (viewer.error || cohort.error || member.error) throw new ResponseLibraryAccessError(403);
  if (!cohort.data || !member.data || !["active", "open", "completed"].includes(cohort.data.status)) throw new ResponseLibraryAccessError(404);
  const viewerMembership = viewer.data ? await db.from("cohort_memberships").select("membership_role").eq("cohort_id", cohortId).eq("participant_id", viewer.data.id).eq("status", "active").limit(1).maybeSingle() : { data: null, error: null };
  if (viewerMembership.error) throw new ResponseLibraryAccessError(403);
  const allowed = canReviewMemberResponses({ globalRole: authorization?.globalRole ?? null, scopedFacilitator: canAccessCohortContext(authorization, cohortId), memberRole: viewerMembership.data?.membership_role ?? null });
  if (!allowed) throw new ResponseLibraryAccessError(403);
  if (await needsExperiencePassword(cohort.data.experience_id)) throw new ResponseLibraryAccessError(403);
  const [person, enrollment, offerings] = await Promise.all([
    db.from("participants").select("full_name,first_name").eq("id", participantId).maybeSingle(),
    db.from("experience_enrollments").select("*").eq("participant_id", participantId).eq("experience_id", cohort.data.experience_id).in("status", ["enrolled", "in_progress", "completed"]).maybeSingle(),
    db.from("experience_offerings").select("*").eq("cohort_id", cohortId).eq("experience_id", cohort.data.experience_id).eq("status", "active"),
  ]);
  if (person.error || enrollment.error || offerings.error) throw new Error("Unable to load this cohort member's work.");
  const courses: ResponseCourse[] = [];
  if (enrollment.data) {
    const matchingOfferings = (offerings.data ?? []).filter((row) => row.experience_version_id === null || row.experience_version_id === enrollment.data!.experience_version_id);
    const offering = matchingOfferings.length === 1 ? matchingOfferings[0] : null;
    if (!offering) throw new ResponseLibraryAccessError(403);
    const context = responseLoadContext(true, request);
    const memberEnrollment = enrollment.data;
    const savedVersions = request.outline || request.box ? await responseVersionIds(participantId, memberEnrollment) : await enrollmentVersions(participantId, memberEnrollment);
    const versions = request.box ? savedVersions.filter((version) => request.box!.startsWith(`${version}:`)) : savedVersions;
    courses.push(...await Promise.all(versions.map((version) => loadCourse(participantId, memberEnrollment, version, offering, false, context))));
  }
  if (!enrollment.data) {
    const offering = offerings.data?.length === 1 ? offerings.data[0] : null;
    if (!offering) throw new ResponseLibraryAccessError(403);
    const experience = await db.from("experiences").select("current_published_version_id").eq("id", cohort.data.experience_id).maybeSingle();
    if (experience.error) throw new Error("Unable to load course questions.");
    const versionId = offering.experience_version_id ?? experience.data?.current_published_version_id;
    if (versionId) courses.push(await loadCourse(participantId, { id: null, experience_id: cohort.data.experience_id }, versionId, offering, false, responseLoadContext(true, request)));
  }
  const audit = await db.from("admin_audit_log").insert({ admin_user_id: user.id, admin_email: user.email ?? "", action: "cohort.member_responses_viewed", entity_type: "participant", entity_id: participantId, metadata: { cohortId, experienceId: cohort.data.experience_id } });
  if (audit.error) throw new Error("Unable to record access to saved responses.");
  return { name: person.data?.full_name || person.data?.first_name || "Cohort member", courses };
}

export async function loadOwnResponseLibrary(): Promise<ResponseLibraryData | null> {
  const user = await getPlatformUser();
  if (!user) return null;
  const db = dbClient();
  const person = await db.from("participants").select("id,full_name,first_name").eq("auth_user_id", user.id).maybeSingle();
  if (person.error || !person.data) return null;
  const enrollments = await db.from("experience_enrollments").select("*").eq("participant_id", person.data.id).order("updated_at", { ascending: false });
  if (enrollments.error) throw new Error("Unable to load your saved work.");
  const courses: ResponseCourse[] = [];
  const lmuExperience = await db.from("experiences").select("id,slug").eq("slug", "life-mapping-u").maybeSingle();
  if (lmuExperience.error) throw new Error("Unable to verify assessment access.");
  for (const enrollment of enrollments.data ?? []) {
    if (enrollment.experience_id === lmuExperience.data?.id) continue;
    for (const version of await enrollmentVersions(person.data.id, enrollment)) courses.push(await loadCourse(person.data.id, enrollment, version));
  }
  if (lmuExperience.data) {
    const locked = await needsExperiencePassword(lmuExperience.data.id);
    const activities = locked ? [] : await lmuActivities(person.data.id);
    if (activities.length || locked) courses.push({ id: "life-mapping-u", title: "Life Mapping U", version: "Assessment history", locked, href: "/experiences/life-mapping-u", weeks: [{ id: "lmu", title: "Assessments", activities }] });
  }
  return { name: person.data.full_name || person.data.first_name || "Your saved work", courses };
}
