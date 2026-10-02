import Link from "next/link";
import { notFound } from "next/navigation";
import { AssessmentResultsList } from "@/components/assessment-results/AssessmentResultsList";
import { CompletedAssessmentResult } from "@/components/assessment-results/CompletedAssessmentResult";
import { emptyPersonalImpactData } from "@/lib/experiences/builder/personal-impact-statement";
import { emptyStartSomethingData } from "@/lib/experiences/builder/start-something";

const completedAt = "2026-10-01T16:00:00.000Z";
const pis = { ...emptyPersonalImpactData(), area_of_influence: "Neighborhood leaders and young adults", causes: ["Education", "Leadership Development", "Mental Health"], rough_1_to: "equip emerging leaders", rough_1_by: "creating practical spaces for learning and belonging", rough_1_so_that: "communities grow healthier and more hopeful", world_change: "More people would recognize that their contribution matters.", mission_loss: "Promising leaders may never receive the encouragement they need.", rough_2_i_will: "build practical pathways", rough_2_help: "emerging community leaders", rough_2_provides: "clarity, confidence, and meaningful action", distilled_statement: "Equip emerging leaders for meaningful community action.", final_impact_statement: "I equip emerging leaders to create healthier, more hopeful communities." };
const start = emptyStartSomethingData();
start.idea.idea_summary = "Create a monthly gathering that connects neighbors with practical ways to serve.";
start.idea.people_location = "Our neighborhood and nearby community organizations.";
start.inventory.needs = "People want to contribute but do not know where to begin.";
start.inventory.causes = "Information and relationships are fragmented.";
start.inventory.responses = "A welcoming, repeatable gathering with clear next steps.";
start.vision.method_strategy = "Begin small, listen carefully, and connect each person to one useful action.";
start.vision.vision_statement = "Neighbors discovering that meaningful action is possible together.";
start.vision.keywords = ["Belonging", "Action", "Hope"];
start.strategy.current_vision = "A tested first gathering.";
start.strategy.desired_future = "A trusted network of neighbors and organizations.";
start.strategy.needed_elements = "A host location, invitations, and three partner organizations.";
start.network.places = ["Neighborhoods", "Faith communities", "Volunteer organizations"];
start.network.locations[0] = { location: "Community church", names: ["Maya", "Theo", "Ruth", "", ""] };
start.next_steps.timeline_stage = "3. Strategy";
start.next_steps.two_week_plan = "Invite three partners, reserve a room, and draft the first gathering outline.";

export default async function AssessmentResultsPreview({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const view = (await searchParams).view ?? "list";
  const summaries = [{ kind: "life-mapping-u" as const, id: "fixture-lmu", name: "Life Mapping U", completedAt }, { kind: "personal-impact-statement" as const, id: "fixture-pis", name: "Personal Impact Statement", completedAt }, { kind: "start-something" as const, id: "fixture-start", name: "Start Something", completedAt }];
  const result = view === "pis" ? { ...summaries[1], data: pis } : view === "start" ? { ...summaries[2], data: start } : { ...summaries[0], data: [{ section_key: "success_stories", finalized_at: completedAt, result_data: { result: { summary: "Your strongest stories consistently show initiative, encouragement, and thoughtful problem solving.", highlights: ["Building trust", "Helping teams move forward", "Creating practical clarity"] } } }, { section_key: "values", finalized_at: completedAt, result_data: { result: { summary: "Your current values point toward service, growth, and meaningful relationships.", rankedItems: [{ id: "service", label: "Service", rank: 1 }, { id: "growth", label: "Growth", rank: 2 }, { id: "belonging", label: "Belonging", rank: 3 }] } } }] };
  return <main className="assessment-results-page dev-assessment-results-preview"><nav className="dev-results-nav"><Link href="?view=list">Results list</Link><Link href="?view=lmu">LMU</Link><Link href="?view=pis">Personal Impact</Link><Link href="?view=start">Start Something</Link></nav>{view === "list" ? <><header><p className="platform-eyebrow">Safe fixture preview</p><h1>My Guided Experience Results</h1><p>Fictitious completed results for local visual review. Nothing is read from or written to participant records.</p></header><AssessmentResultsList results={summaries} href={(item) => `?view=${item.kind === "life-mapping-u" ? "lmu" : item.kind === "personal-impact-statement" ? "pis" : "start"}`}/></> : <div className="assessment-result-page"><CompletedAssessmentResult result={result}/></div>}</main>;
}
