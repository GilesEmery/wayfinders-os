import { CircleOfInfluenceResults } from "@/components/experiences/builder/CircleOfInfluenceResults";
import { normalizeCircleData } from "@/lib/experiences/builder/circle-of-influence";
import { activatePurposeResults, normalizeActivatePurposeAnswers } from "@/lib/experiences/builder/activate-purpose-assessment";
import { ethosResults, normalizeEthosAnswers } from "@/lib/experiences/builder/ethos-assessment";
import { launchingHubResult, normalizeLaunchingHubAnswers } from "@/lib/experiences/builder/launching-wayfinders-hub-assessment";
import { LMUAdminResult } from "@/components/admin/LMUAdminResult";
import { composeRoughDraftOne, composeRoughDraftTwo, type PersonalImpactData } from "@/lib/experiences/builder/personal-impact-statement";
import type { StartSomethingData } from "@/lib/experiences/builder/start-something";
import type { AssessmentResultKind } from "@/lib/assessment-results";
import { PrintResultsButton } from "./PrintResultsButton";

function completedDate(value: string) { return new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(value)); }

export function CompletedAssessmentResult({ result }: { result: { kind: AssessmentResultKind; id: string; name: string; completedAt: string; data: unknown } }) {
  return <article className={`completed-assessment-result is-${result.kind}`}>
    <header className="completed-assessment-result-header"><div><p>PurposeOS Guided Experience</p><h1>{result.name}</h1><span>Completed {completedDate(result.completedAt)}</span></div><PrintResultsButton/></header>
    {result.kind === "circle-of-influence" ? <CircleOfInfluenceResults data={normalizeCircleData(result.data)}/> : result.kind === "personal-impact-statement" ? <PersonalImpactResult data={result.data as PersonalImpactData}/> : result.kind === "start-something" ? <StartSomethingResult data={result.data as StartSomethingData}/> : result.kind !== "life-mapping-u" ? <NativeResult kind={result.kind} data={result.data}/> : <LifeMappingResult rows={result.data as Array<{ section_key: string; result_data: unknown; finalized_at: string }>}/>}
    <footer className="completed-assessment-result-footer"><span>PurposeOS</span><span>{result.name}</span></footer>
  </article>;
}

function PersonalImpactResult({ data }: { data: PersonalImpactData }) {
  return <main className="completed-pis-result"><blockquote>{data.final_impact_statement}</blockquote><section><h2>Areas You Care About</h2><div>{data.causes.map((cause) => <span key={cause}>{cause}</span>)}</div></section><section><h2>Area of Influence</h2><p>{data.area_of_influence}</p></section><dl><div><dt>Rough Draft #1</dt><dd>{composeRoughDraftOne(data)}</dd></div><div><dt>What’s at Stake?</dt><dd><p>{data.world_change}</p><p>{data.mission_loss}</p></dd></div><div><dt>Rough Draft #2</dt><dd>{composeRoughDraftTwo(data)}</dd></div><div><dt>Distilled Statement</dt><dd>{data.distilled_statement}</dd></div></dl></main>;
}

function StartSomethingResult({ data }: { data: StartSomethingData }) {
  return <main className="completed-start-result"><blockquote>{data.vision.vision_statement || data.idea.idea_summary}</blockquote><div className="completed-start-grid"><section><h2>The Idea</h2><p>{data.idea.idea_summary || "Not answered"}</p><p>{data.idea.people_location}</p></section><section><h2>Vision &amp; Strategy</h2><p>{data.vision.method_strategy || "Not answered"}</p><div>{data.vision.keywords.filter(Boolean).map((word) => <span key={word}>{word}</span>)}</div></section><section><h2>What You See</h2><p><strong>Needs</strong><br/>{data.inventory.needs || "Not answered"}</p><p><strong>Underlying causes</strong><br/>{data.inventory.causes || "Not answered"}</p><p><strong>Possible responses</strong><br/>{data.inventory.responses || "Not answered"}</p></section><section><h2>How You’ll Move</h2><p>{data.strategy.desired_future || data.strategy.current_vision || "Not answered"}</p><p>{data.strategy.needed_elements}</p></section><section className="is-wide"><h2>Your Network</h2><p>{data.network.places.join(" · ") || "No settings selected"}</p>{data.network.locations.filter((item) => item.location || item.names.some(Boolean)).map((item, index) => <div key={`${item.location}-${index}`}><strong>{item.location || `Location ${index + 1}`}</strong><p>{item.names.filter(Boolean).join(" · ")}</p></div>)}</section><section><h2>Current Stage</h2><p>{data.next_steps.timeline_stage || "Not selected"}</p></section><section><h2>The Next Two Weeks</h2><p>{data.next_steps.two_week_plan || "Not answered"}</p></section></div></main>;
}

function LifeMappingResult({ rows }: { rows: Array<{ section_key: string; result_data: unknown; finalized_at: string }> }) {
  return <main className="completed-lmu-result"><p className="completed-result-lede">Your finalized Life Mapping U discoveries, preserved by module.</p>{rows.length ? rows.map((row) => <section key={row.section_key}><h2>{row.section_key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}</h2><LMUAdminResult value={row.result_data}/></section>) : <p>This legacy completion does not contain finalized section results.</p>}</main>;
}

function NativeResult({ kind, data }: { kind: AssessmentResultKind; data: unknown }) {
  if (kind === "activate-your-purpose") return <main>{activatePurposeResults(normalizeActivatePurposeAnswers(data))?.map(({ area, score, stage }) => <section key={area.key}><h2>{area.title}</h2><strong>{score} / 20 · {stage.title}</strong><p>{stage.description}</p></section>)}</main>;
  if (kind === "wayfinders-ethos") {
    const results = ethosResults(normalizeEthosAnswers(data));
    return <main>{results && (results.allEqual ? <section><h2>Balanced Ethos</h2><p>All five Ethos areas are tied.</p></section> : <section><h2>Highest Ethos · Strongest areas</h2><p>{results.strongest.map(({ category, score }) => `${category.title} · ${score} / 15`).join("; ")}</p><h2>Lowest Ethos · Growth areas</h2><p>{results.growth.map(({ category, score }) => `${category.title} · ${score} / 15`).join("; ")}</p></section>)}{results?.scores.map(({ category, score }) => <section key={category.key}><h2>{category.title}</h2><strong>{score} / 15</strong><p>{category.description}</p></section>)}</main>;
  }
  const result = launchingHubResult(normalizeLaunchingHubAnswers(data));
  return <main>{result && <section><h2>{result.readiness.label}</h2><strong>{result.score} / 50</strong><p>{result.readiness.description}</p><h3>Focus</h3><p>{result.readiness.focus}</p></section>}</main>;
}
