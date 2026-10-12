import "server-only";
import { unstable_cache } from "next/cache";
import { getExperienceStructure } from "./data";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

// This cache is server-internal content, not a route/access cache. The caller
// must freshly authorize the published version before every invocation.
// No participant, grants, responses, progress, delivery overrides or signed URLs.
export const loadPublishedCourseContent = unstable_cache(
  async (experienceId: string, versionId: string, moduleKey: string, lessonKey: string, sectionKey: string) => {
    const structure = await getExperienceStructure(experienceId, versionId, createAdminSupabaseClient(), undefined,
      moduleKey && lessonKey && sectionKey ? { moduleKey, lessonKey, sectionKey } : undefined);
    if (structure.version.status !== "published") throw new Error("Published Course content is unavailable.");
    return structure;
  },
  ["purposeos-published-content-v1"],
  { revalidate: 600 },
);
