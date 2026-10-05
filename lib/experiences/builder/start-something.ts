export const START_SOMETHING_RENDERER_KEY = "start-something.v1";
export const START_SOMETHING_RESPONSE_KEY = "start_something";
export const START_SOMETHING_SLUG = "start-something";
export const START_SOMETHING_SCHEMA_VERSION = 1;

export const START_SOMETHING_STAGES = ["Idea", "Inventory", "Vision", "Strategy", "Network", "Progress + Next Steps"] as const;
export const START_SOMETHING_TIMELINE = ["1. Idea", "2. Vision", "3. Strategy", "4. Recruit Team", "5. Experiment", "6. Commit"] as const;
export const START_SOMETHING_NETWORK_PLACES = [
  "Church", "Coffee shop", "Work", "Sports & fitness groups", "University & alumni networks",
  "Community events & meetups", "Online groups & social media", "Networking events & conferences",
  "Volunteer organizations", "Mentorship & coaching programs", "Local businesses & coworking spaces",
  "Libraries & book clubs", "Parks & outdoor recreation groups", "Arts & music communities",
  "Nonprofit & humanitarian efforts", "Civic & government meetings", "Entrepreneurship & startup hubs",
  "Support groups & wellness retreats", "Neighborhood associations", "Family & friends", "Other",
] as const;

export const START_SOMETHING_PROMPTS = Object.freeze({
  idea_summary: "Summarize your idea here.",
  idea_origin: "How did you come up with this idea?",
  people_location: "What people group or location do you feel called to serve?",
  redemptive_work: "How might this work be redemptive?",
  needs: "What needs and problems do you see around you?",
  causes: "What are the underlying causes of these problems?",
  responses: "What ways could you address and respond to these needs?",
  negative_impact: "Could you see any possible negative impact to the response you’re considering?",
  partnerships: "Who else is working in this field? What would a partnership look like?",
  success: "How will you know when you have accomplished what you’ve set out to do?",
  community_loss: "If the work ceased to exist, my community would be worse off because…",
  resources: "What resources would you use or need? (Some you may have, some you may borrow, and some may need to be developed.)",
  method_strategy: "Write a brief paragraph describing your method and strategy for carrying out your mission/work.",
  keywords: "What are three or four keywords that would best describe what you have written above?",
  vision_statement: "Using those words, write a short vision statement for your mission/work.",
  current_vision: "Where is your vision right now? What systems/plans/elements do you have in place (i.e., resources, location, etc.)?",
  desired_future: "Where do you want to go? What do you want to achieve? If your mission field could be perfect, what would it look like?",
  needed_elements: "What sort of things do you need to set in place to get where you’d like to be?",
  values: "What are the values you want to pass along?",
  share_values: "How will you go about sharing these values?",
  planned_elements: "What sort of elements (volunteers, events, programs, resources, etc.) do you plan on utilizing to achieve the vision?",
  distinctiveness: "How is this work different from others that are similar?",
} as const);

export type StartSomethingLocation = { location: string; names: string[] };
export type StartSomethingData = {
  idea: Record<"idea_summary" | "idea_origin" | "people_location" | "redemptive_work", string>;
  inventory: Record<"needs" | "causes" | "responses" | "negative_impact" | "partnerships" | "success" | "community_loss" | "resources", string>;
  vision: { method_strategy: string; keywords: string[]; vision_statement: string };
  strategy: Record<"current_vision" | "desired_future" | "needed_elements" | "values" | "share_values" | "planned_elements" | "distinctiveness", string>;
  network: { places: string[]; other: string; locations: StartSomethingLocation[]; additional_locations: string; indirect_connections: string };
  next_steps: { timeline_stage: string; two_week_plan: string };
};
export type StartSomethingFinishedResult = { schemaVersion: 1; sourceVersion: "start-something.v1"; completedAt: string; participantMaterial: StartSomethingData };
export type StartSomethingEnvelope = { schemaVersion: 1; draft: StartSomethingData; finished: StartSomethingFinishedResult | null };

const text = (value: unknown) => typeof value === "string" ? value.slice(0, 12000) : "";
const stringRecord = <T extends readonly string[]>(source: Record<string, unknown>, keys: T) => Object.fromEntries(keys.map((key) => [key, text(source[key])])) as Record<T[number], string>;
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export function emptyStartSomethingData(): StartSomethingData {
  return {
    idea: { idea_summary: "", idea_origin: "", people_location: "", redemptive_work: "" },
    inventory: { needs: "", causes: "", responses: "", negative_impact: "", partnerships: "", success: "", community_loss: "", resources: "" },
    vision: { method_strategy: "", keywords: ["", "", "", ""], vision_statement: "" },
    strategy: { current_vision: "", desired_future: "", needed_elements: "", values: "", share_values: "", planned_elements: "", distinctiveness: "" },
    network: { places: [], other: "", locations: Array.from({ length: 5 }, () => ({ location: "", names: ["", "", "", "", ""] })), additional_locations: "", indirect_connections: "" },
    next_steps: { timeline_stage: "", two_week_plan: "" },
  };
}

export function normalizeStartSomethingData(input: unknown): StartSomethingData {
  const root = object(input); const source = object(root.draft ?? root.response ?? root);
  const idea = object(source.idea); const inventory = object(source.inventory); const vision = object(source.vision); const strategy = object(source.strategy); const network = object(source.network); const next = object(source.next_steps);
  const allowedPlaces = new Set<string>(START_SOMETHING_NETWORK_PLACES);
  const places = Array.isArray(network.places) ? [...new Set(network.places.filter((v): v is string => typeof v === "string" && allowedPlaces.has(v)))].slice(0, 5) : [];
  const locations = Array.from({ length: 5 }, (_, index) => { const row = object(Array.isArray(network.locations) ? network.locations[index] : null); return { location: text(row.location), names: Array.from({ length: 5 }, (__, nameIndex) => text(Array.isArray(row.names) ? row.names[nameIndex] : "")) }; });
  return {
    idea: stringRecord(idea, ["idea_summary", "idea_origin", "people_location", "redemptive_work"] as const),
    inventory: stringRecord(inventory, ["needs", "causes", "responses", "negative_impact", "partnerships", "success", "community_loss", "resources"] as const),
    vision: { method_strategy: text(vision.method_strategy), keywords: Array.from({ length: 4 }, (_, index) => text(Array.isArray(vision.keywords) ? vision.keywords[index] : "").slice(0, 80)), vision_statement: text(vision.vision_statement) },
    strategy: stringRecord(strategy, ["current_vision", "desired_future", "needed_elements", "values", "share_values", "planned_elements", "distinctiveness"] as const),
    network: { places, other: text(network.other), locations, additional_locations: text(network.additional_locations), indirect_connections: text(network.indirect_connections) },
    next_steps: { timeline_stage: START_SOMETHING_TIMELINE.includes(next.timeline_stage as never) ? String(next.timeline_stage) : "", two_week_plan: text(next.two_week_plan) },
  };
}

export function normalizeStartSomethingEnvelope(input: unknown): StartSomethingEnvelope {
  const root = object(input); const finished = object(root.finished);
  const validFinished = finished.schemaVersion === 1 && finished.sourceVersion === START_SOMETHING_RENDERER_KEY && typeof finished.completedAt === "string";
  return { schemaVersion: 1, draft: normalizeStartSomethingData(root), finished: validFinished ? { schemaVersion: 1, sourceVersion: START_SOMETHING_RENDERER_KEY, completedAt: finished.completedAt as string, participantMaterial: normalizeStartSomethingData(finished.participantMaterial) } : null };
}

export function createStartSomethingFinished(data: StartSomethingData, completedAt: string): StartSomethingFinishedResult {
  return { schemaVersion: 1, sourceVersion: START_SOMETHING_RENDERER_KEY, completedAt, participantMaterial: normalizeStartSomethingData(data) };
}

export const startSomethingEquivalent = (a: StartSomethingData, b: StartSomethingData) => JSON.stringify(normalizeStartSomethingData(a)) === JSON.stringify(normalizeStartSomethingData(b));

export function projectStartSomethingSave(priorInput: unknown, draftInput: unknown, finish: boolean, now: string): StartSomethingEnvelope {
  const prior = normalizeStartSomethingEnvelope(priorInput);
  if (finish && (!draftInput || typeof draftInput !== "object" || Array.isArray(draftInput))) throw new Error("Your response is invalid. Please review and retry.");
  const draft = normalizeStartSomethingData(draftInput);
  const finished = prior.finished ?? (finish ? createStartSomethingFinished(draft, now) : null);
  return { schemaVersion: 1, draft, finished };
}

/** Populate selected circles and keep each setting's names together when selections change. */
export function syncStartSomethingPlaces(network: StartSomethingData["network"], places: string[], other = network.other): StartSomethingData["network"] {
  const used = new Set<number>();
  const locations = places.map(place => {
    let index = network.places.indexOf(place);
    if (index < 0) index = network.locations.findIndex((row, index) => !used.has(index) && row.location === place);
    const prior = index >= 0 ? network.locations[index] : undefined;
    if (index >= 0) used.add(index);
    const label = place === "Other" ? other.trim() || "Other" : place;
    const previousLabel = place === "Other" ? network.other.trim() || "Other" : place;
    return { location: !prior?.location.trim() || prior.location === previousLabel ? label : prior.location, names: prior ? [...prior.names] : ["", "", "", "", ""] };
  });
  // Retain removed settings' existing work in unused slots instead of discarding it.
  const retained = network.locations.filter((row, index) => !used.has(index) && (row.location || row.names.some(Boolean)));
  while (locations.length < 5) locations.push(retained.shift() ?? { location: "", names: ["", "", "", "", ""] });
  return { ...network, places, other, locations };
}
