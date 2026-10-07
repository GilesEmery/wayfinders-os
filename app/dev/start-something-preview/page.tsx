import { notFound } from "next/navigation";
import { StartSomethingExperience } from "@/components/experiences/builder/StartSomethingExperience";
import { createStartSomethingFinished, emptyStartSomethingData } from "@/lib/experiences/builder/start-something";

const fixture = emptyStartSomethingData();

Object.assign(fixture.idea, {
  idea_summary: "Create a welcoming neighborhood table where people can share a meal, tell their stories, and find practical support.",
  idea_origin: "I kept meeting neighbors who wanted deeper connection but did not know where to begin.",
  people_location: "Adults and families living within walking distance of our community center.",
  redemptive_work: "It can replace isolation with belonging and turn shared concern into practical care.",
});
Object.assign(fixture.inventory, {
  needs: "Loneliness, fragmented relationships, and limited awareness of local support.",
  causes: "Busy schedules, few shared spaces, and hesitation about asking for help.",
  responses: "Host a simple monthly meal and invite local organizations to offer a practical next step.",
  partnerships: "Neighborhood associations, churches, schools, and local food businesses.",
});
Object.assign(fixture.vision, {
  method_strategy: "Begin with a small monthly gathering, listen carefully, and grow through trusted relationships rather than a large launch.",
  keywords: ["Belonging", "Listening", "Hospitality", "Action"],
  vision_statement: "A neighborhood where shared tables create belonging and turn listening into meaningful action.",
});
Object.assign(fixture.strategy, {
  current_vision: "A committed host team and a possible venue are already in place.",
  desired_future: "Neighbors know one another, recognize local needs, and respond together.",
  needed_elements: "A regular venue, food partners, invitation materials, and a simple follow-up rhythm.",
});
fixture.network.places = ["Church", "Coffee shop", "Community events & meetups", "Local businesses & coworking spaces", "Family & friends"];
fixture.network.locations = [
  { location: "Community church", names: ["Maya", "Theo", "Ruth", "", ""] },
  { location: "Corner coffee shop", names: ["Jordan", "Sam", "", "", ""] },
  { location: "Saturday market", names: ["Ari", "Leah", "Nia", "", ""] },
  { location: "Local businesses", names: ["Ben", "Amara", "", "", ""] },
  { location: "Friends and family", names: ["Elena", "Marcus", "", "", ""] },
];
fixture.next_steps = { timeline_stage: "3. Strategy", two_week_plan: "Confirm the first venue, invite the host team, and hold three listening conversations with neighbors." };

const route = { slug: "start-something", moduleKey: "preview", lessonKey: "preview", sectionKey: "preview", blockKey: "preview" };

export default async function StartSomethingPreviewPage({ searchParams }: { searchParams: Promise<{ view?: string; mode?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { view, mode } = await searchParams;
  const initialData = view === "result"
    ? { schemaVersion: 1, draft: fixture, finished: createStartSomethingFinished(fixture, "2026-10-01T12:00:00.000Z") }
    : { schemaVersion: 1, draft: view === "intro" ? emptyStartSomethingData() : fixture, finished: null };

  return <StartSomethingExperience initialData={initialData} route={route} preview mode={mode === "course" ? "course" : "standalone"} />;
}
