"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Accessibility, Activity, BriefcaseBusiness, Check, CircleDollarSign,
  Droplets, Earth, GraduationCap, HandHeart, HandPlatter, HeartHandshake, Hospital,
  Landmark, Leaf, Lightbulb, Palette, PersonStanding, Scale, ShieldCheck,
  Sparkles, Users, UsersRound,
} from "lucide-react";
import { savePersonalImpactStatementAction } from "@/lib/experiences/builder/personal-impact-statement-actions";
import { PlatformAccountControl } from "@/components/platform/PlatformAccountControl";
import { PlatformBrand } from "@/components/platform/PlatformBrand";
import {
  PERSONAL_IMPACT_CAUSES, PERSONAL_IMPACT_STAGES, composeRoughDraftOne, composeRoughDraftTwo,
  firstIncompletePersonalImpactStage, normalizePersonalImpactData, personalImpactComplete,
  type PersonalImpactData,
} from "@/lib/experiences/builder/personal-impact-statement";

type Route = { slug: string; moduleKey: string; lessonKey: string; sectionKey: string; blockKey: string; cohortId?: string | null };
type View = "intro" | "assessment" | "result" | "review";
export type PersonalImpactStatementMode = "standalone" | "course";
const icons = [CircleDollarSign, Users, ShieldCheck, Activity, PersonStanding, Sparkles, Scale, Hospital, UsersRound, GraduationCap, Leaf, ShieldCheck, Droplets, Accessibility, HeartHandshake, Palette, Landmark, BriefcaseBusiness, HandHeart, ShieldCheck, HandPlatter, Earth, Lightbulb, BriefcaseBusiness];

const teaching = {
  influence: [
    "Our experiences—whether positive or negative—often become the very things God uses to shape our influence and calling. The moments that inspire us or break us tend to form the deepest wells of empathy and conviction, guiding us toward the people and causes we’re uniquely equipped to serve.",
    "A positive experience can ignite a lifelong passion to give back. For example, Malala Yousafzai’s love of learning and early encouragement from her father, an educator, gave her a vision of what education could do to transform a community. When extremists later tried to silence her, that positive foundation in the power of knowledge became the driving force behind her global advocacy for girls’ education.",
    "In contrast, a negative experience can become redemptive when transformed by grace and perseverance. Nelson Mandela’s early encounters with systemic racism in apartheid South Africa fueled deep anger and led him to violent resistance. Yet during his 27 years in prison, those painful experiences were reshaped into wisdom, forgiveness, and a vision for reconciliation.",
    "Both stories reveal that our influence often flows out of what we’ve lived through—the joys that inspire us and the wounds that humble us. When we allow God to redeem those experiences, even our pain becomes a pathway for healing and purpose in the lives of others.",
  ],
  causes: [
    "Our stories—both the joyful and the painful—often prepare us to see the world in a particular way. The experiences that shape us begin to awaken compassion for certain people, places, or problems. What once brought us delight might stir us to help others experience that same good, and what once caused us pain might drive us to make sure others never face it alone. Out of those lived moments, our hearts begin to respond to the world’s conflicts and causes.",
    "As you look at the images below, each representing a different cause or area of need, pay attention to what draws you in. Which images make you pause, feel something, or spark a sense of compassion or curiosity? Don’t overthink it—simply notice what matters to you. Often, the causes that stir our hearts reveal something about how God has uniquely wired us to care, serve, and make a difference in the world around us.",
  ],
};

function Draft({ children, label }: { children: React.ReactNode; label: string }) {
  return <aside className="pis-reference"><span>{label}</span><p>{children}</p></aside>;
}

function Field({ label, sublabel, value, onChange, rows = 2 }: { label: string; sublabel?: string; value: string; onChange: (value: string) => void; rows?: number }) {
  const id = `pis-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return <label className="pis-field" htmlFor={id}><strong>{label}</strong>{sublabel && <span>{sublabel}</span>}<textarea id={id} rows={rows} value={value} onChange={(event) => onChange(event.target.value)}/></label>;
}

function PreviousResponses({ data, stage }: { data: PersonalImpactData; stage: number }) {
  if (stage === 0) return null;
  const causes = [...data.causes.filter((cause) => cause !== "Other"), ...(data.causes.includes("Other") && data.causes_other ? [`Other: ${data.causes_other}`] : [])];
  return <details className="pis-previous-responses">
    <summary><span><strong>Your Previous Responses</strong><small>Open this anytime to remember what you shared earlier.</small></span><span aria-hidden="true">+</span></summary>
    <dl>
      <div><dt>Area of Influence</dt><dd>{data.area_of_influence}</dd></div>
      {stage > 1 && <div><dt>Causes You Care About</dt><dd><ul>{causes.map((cause) => <li key={cause}>{cause}</li>)}</ul></dd></div>}
      {stage > 2 && <div><dt>Rough Draft #1</dt><dd>{composeRoughDraftOne(data)}</dd></div>}
      {stage > 3 && <div><dt>What’s at Stake?</dt><dd><p>{data.world_change}</p><p>{data.mission_loss}</p></dd></div>}
      {stage > 4 && <div><dt>Rough Draft #2</dt><dd>{composeRoughDraftTwo(data)}</dd></div>}
      {stage > 5 && <div><dt>Distilled Statement</dt><dd>{data.distilled_statement}</dd></div>}
    </dl>
  </details>;
}

export function PersonalImpactStatementAssessment({ initialData, route, preview = false, returnTo = null, mode = "course" }: { initialData: unknown; route: Route; preview?: boolean; returnTo?: string | null; mode?: PersonalImpactStatementMode }) {
  const initial = normalizePersonalImpactData(initialData);
  const [data, setData] = useState(initial);
  const [stage, setStage] = useState(() => firstIncompletePersonalImpactStage(initial));
  const [view, setView] = useState<View>(() => personalImpactComplete(initial) ? "result" : "intro");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const queued = useRef(Promise.resolve());
  useEffect(() => {
    if (preview) return;
    const timer = window.setTimeout(() => {
      setSaveState("saving");
      queued.current = queued.current.then(async () => {
        try { await savePersonalImpactStatementAction(route.slug, route.moduleKey, route.lessonKey, route.sectionKey, route.blockKey, route.cohortId, data); setSaveState("saved"); }
        catch { setSaveState("error"); }
      });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [data, preview, route]);

  const update = <K extends keyof PersonalImpactData>(key: K, value: PersonalImpactData[K]) => setData((current) => ({ ...current, [key]: value }));
  const valid = [
    Boolean(data.area_of_influence.trim()),
    data.causes.length > 0 && (!data.causes.includes("Other") || Boolean(data.causes_other.trim())),
    Boolean(data.rough_1_to.trim() && data.rough_1_by.trim() && data.rough_1_so_that.trim()),
    Boolean(data.world_change.trim() && data.mission_loss.trim()),
    Boolean(data.rough_2_i_will.trim() && data.rough_2_help.trim() && data.rough_2_provides.trim()),
    Boolean(data.distilled_statement.trim()), Boolean(data.final_impact_statement.trim()),
  ];

  function toggleCause(cause: string) {
    setMessage("");
    if (data.causes.includes(cause)) return update("causes", data.causes.filter((item) => item !== cause));
    if (data.causes.length >= 4) { setMessage("You can select up to 4."); return; }
    update("causes", [...data.causes, cause]);
  }

  function next() {
    if (!valid[stage]) { setMessage(stage === 1 ? "Choose at least one cause and complete Other when selected." : "Complete each required reflection before continuing."); return; }
    setMessage("");
    if (stage < 6) setStage((value) => value + 1);
    else if (personalImpactComplete(data)) setView("result");
  }

  const headerContext = view === "assessment" ? `${stage + 1} of 7 · ${PERSONAL_IMPACT_STAGES[stage]}` : view === "result" ? "Complete" : view === "review" ? "Review" : "Assessment";
  function shell(content: React.ReactNode) {
    if (preview) return <div className={`pis-shell is-${mode} is-preview`}>{content}</div>;
    return <div className={`pis-shell is-${mode}`}>
      <header className="pis-shell-header"><PlatformBrand/><strong>Personal Impact Statement</strong><div><span>{headerContext}</span><PlatformAccountControl/></div></header>
      <nav className="pis-shell-back" aria-label="Assessment context"><Link href={returnTo ?? "/dashboard"}>← {returnTo ? "Return to Course" : "My Dashboard"}</Link></nav>
      <main className="pis-shell-main">{content}</main>
    </div>;
  }

  if (view === "intro") return shell(<section className="pis-experience pis-intro">
    <div className="pis-contours" aria-hidden="true"/><h1>Personal Impact Statement</h1>
    <p className="pis-lede">A Personal Impact Statement allows you to express clearly and succinctly who you are, your unique skills and what you want to accomplish.</p>
    <p>It serves as a guiding light to assist you in staying true to your values and priorities.</p>
    <div className="pis-principles"><article><Sparkles/><strong>Integrates who we are</strong></article><article><Landmark/><strong>Provides focus</strong></article><article><Scale/><strong>Simplifies decision-making</strong></article><article><Check/><strong>Accountability to stay on mission</strong></article></div>
    <div className="pis-actions"><button className="pis-primary" type="button" onClick={() => { setStage(firstIncompletePersonalImpactStage(data)); setView("assessment"); }}>{JSON.stringify(data) === JSON.stringify(normalizePersonalImpactData({})) ? "Start My Statement" : "Continue My Statement"}</button>{returnTo && <a href={returnTo}>Return to Course</a>}</div>
  </section>);

  if (view === "result") return shell(<section className="pis-experience pis-result">
    <div className="pis-contours" aria-hidden="true"/><p className="pis-kicker">Your Personal Impact Statement</p><blockquote>{data.final_impact_statement}</blockquote>
    <section><h2>Areas You Care About</h2><div className="pis-result-causes">{data.causes.map((cause) => <span key={cause}>{cause}</span>)}</div></section>
    <section><h2>Area of Influence</h2><p>{data.area_of_influence}</p></section>
    <div className="pis-actions"><button type="button" onClick={() => { setStage(6); setView("assessment"); }}>Edit Statement</button><button type="button" onClick={() => navigator.clipboard.writeText(data.final_impact_statement)}>Copy Statement</button><button type="button" onClick={() => setView("review")}>Review My Responses</button><button type="button" onClick={() => window.print()}>Print / Save as PDF</button>{returnTo && <a href={returnTo}>Return to Course</a>}</div>
  </section>);

  if (view === "review") return shell(<section className="pis-experience pis-review"><p className="pis-kicker">Your progression</p><h1>Review My Responses</h1>
    <dl><dt>Area of Influence</dt><dd>{data.area_of_influence}</dd><dt>Selected Causes</dt><dd>{data.causes.join(", ")}{data.causes_other ? ` — ${data.causes_other}` : ""}</dd><dt>Rough Draft #1</dt><dd>{composeRoughDraftOne(data)}</dd><dt>What’s at Stake?</dt><dd>{data.world_change}<br/><br/>{data.mission_loss}</dd><dt>Rough Draft #2</dt><dd>{composeRoughDraftTwo(data)}</dd><dt>Distilled Statement</dt><dd>{data.distilled_statement}</dd><dt>Final Statement</dt><dd>{data.final_impact_statement}</dd></dl>
    <button className="pis-primary" type="button" onClick={() => setView("result")}>Back to My Statement</button>
  </section>);

  return shell(<section className="pis-experience pis-assessment">
    <div className="pis-contours" aria-hidden="true"/>
    <nav className="pis-progress" aria-label="Assessment progress"><span>Stage {stage + 1} of 7</span><ol>{PERSONAL_IMPACT_STAGES.map((name, index) => <li key={name} className={index === stage ? "is-current" : index < stage || valid[index] ? "is-complete" : ""} aria-current={index === stage ? "step" : undefined}><button type="button" onClick={() => setStage(index)} aria-label={`Stage ${index + 1}: ${name}`}>{index < stage || valid[index] ? <Check/> : index + 1}</button><span>{name}</span></li>)}</ol></nav>
    <header><span className="pis-stage-badge" aria-hidden="true">{stage + 1}</span><p className="pis-kicker">Stage {stage + 1}</p><h1>{PERSONAL_IMPACT_STAGES[stage]}</h1>{returnTo && <a className="pis-return-link" href={returnTo}>Return to Course</a>}</header>
    <div className="pis-stage" key={stage}>
      {stage === 0 && <><div className="pis-teaching">{teaching.influence.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div><Field label="Now share 1 or 2 experiences in your own life (either positive or negative) that allow/s you (or could allow you) to have influence within a certain group or community of people?" value={data.area_of_influence} onChange={(value) => update("area_of_influence", value)} rows={7}/></>}
      {stage === 1 && <><div className="pis-teaching">{teaching.causes.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div><fieldset className="pis-causes"><legend>Now select some Conflicts/ Causes that you want to address in your life? (or are passionate about) - Select up to 4 choices</legend><p aria-live="polite">{data.causes.length} of 4 selected</p><div>{PERSONAL_IMPACT_CAUSES.map((cause, index) => { const Icon = icons[index]; const selected = data.causes.includes(cause); return <button type="button" role="checkbox" aria-checked={selected} className={selected ? "is-selected" : ""} key={cause} onClick={() => toggleCause(cause)}><Icon aria-hidden="true"/><span>{cause}</span>{selected && <Check className="pis-check" aria-hidden="true"/>}</button>; })}<button type="button" role="checkbox" aria-checked={data.causes.includes("Other")} className={data.causes.includes("Other") ? "is-selected" : ""} onClick={() => toggleCause("Other")}><Lightbulb aria-hidden="true"/><span>Other</span>{data.causes.includes("Other") && <Check className="pis-check" aria-hidden="true"/>}</button></div></fieldset>{data.causes.includes("Other") && <Field label="Other" value={data.causes_other} onChange={(value) => update("causes_other", value)}/>}</>}
      {stage === 2 && <><div className="pis-teaching"><p>Your Personal Impact Statement is a simple way to put words to the unique difference you want to make in the world. It captures what you want to do, how you’ll do it, and why it matters—connecting your experiences, passions, and purpose into one clear sentence.</p><p>Think of it as a first draft—a starting point for reflection and refinement as you continue your journey. Don’t worry about getting it perfect.</p><p><strong>Example: Malala Yousafzai</strong><br/>To empower girls around the world to receive an education by using my voice, story, and global platform to advocate for access to schools and equal opportunity so that every girl can learn, lead, and create a more just and peaceful future.</p></div><div className="pis-field-grid"><Field label="To:" sublabel="[what you want to do]" value={data.rough_1_to} onChange={(value) => update("rough_1_to", value)}/><Field label="by:" sublabel="[the unique way you'll do it]" value={data.rough_1_by} onChange={(value) => update("rough_1_by", value)}/><Field label="so that:" sublabel="[the impact, difference, or outcome you hope to make]" value={data.rough_1_so_that} onChange={(value) => update("rough_1_so_that", value)}/></div><Draft label="Rough Draft #1"><strong>TO</strong> {data.rough_1_to || "…"} <strong>BY</strong> {data.rough_1_by || "…"} <strong>SO THAT</strong> {data.rough_1_so_that || "…"}.</Draft></>}
      {stage === 3 && <><Draft label="Rough Draft #1">{composeRoughDraftOne(data)}</Draft><div className="pis-field-grid"><Field label="Based on your rough draft of your Personal Impact Statement - How might the world change if you fulfill this mission?" value={data.world_change} onChange={(value) => update("world_change", value)} rows={6}/><Field label="What will be lost if you don't fulfill your mission?" value={data.mission_loss} onChange={(value) => update("mission_loss", value)} rows={6}/></div></>}
      {stage === 4 && <><div className="pis-teaching"><p>Now that you’ve written your first draft, let’s look at it from another angle. Sometimes rephrasing your statement helps you see your purpose more clearly or highlight a different aspect of your calling. This second version focuses on action and impact—what you will do, who you will serve, and what change or value you hope to bring.</p><p><strong>Example: Malala Yousafzai</strong><br/>I will use my story and voice to advocate for girls’ education in order to help young women around the world access equal opportunities for learning in a way that produces empowerment, confidence, and lasting change in their communities.</p></div><Draft label="Rough Draft #1">{composeRoughDraftOne(data)}</Draft><div className="pis-field-grid"><Field label="I will:" sublabel="[do what]" value={data.rough_2_i_will} onChange={(value) => update("rough_2_i_will", value)}/><Field label="in order to help:" sublabel="[who]" value={data.rough_2_help} onChange={(value) => update("rough_2_help", value)}/><Field label="in a way that produces/ provides:" sublabel="[what change, transformation or value]" value={data.rough_2_provides} onChange={(value) => update("rough_2_provides", value)}/></div><Draft label="Rough Draft #2"><strong>I WILL</strong> {data.rough_2_i_will || "…"} <strong>IN ORDER TO HELP</strong> {data.rough_2_help || "…"} <strong>IN A WAY THAT PRODUCES/ PROVIDES</strong> {data.rough_2_provides || "…"}.</Draft></>}
      {stage === 5 && <><p className="pis-prompt">Now distill it down again by removing any unnecessary words:</p><div className="pis-reference-grid"><Draft label="Rough Draft #1">{composeRoughDraftOne(data)}</Draft><Draft label="Rough Draft #2">{composeRoughDraftTwo(data)}</Draft></div><Field label="Distilled Statement" value={data.distilled_statement} onChange={(value) => update("distilled_statement", value)} rows={7}/></>}
      {stage === 6 && <><div className="pis-teaching"><p>Now that you’ve written two rough drafts, you’re ready to bring it all together.</p><p>Your final Personal Impact Statement should feel clear, personal, and purposeful—it’s a synthesis of your earlier drafts, refined to capture the essence of your calling.</p><p><strong>Final Personal Impact Statement (Malala’s actual statement):</strong><br/><em>“I want to serve the people. And I want every girl, every child to be educated.”</em></p><p>Aim for clarity, brevity, and authenticity—this statement should sound like you.</p></div><div className="pis-reference-grid"><Draft label="Rough Draft #1">{composeRoughDraftOne(data)}</Draft><Draft label="Rough Draft #2">{composeRoughDraftTwo(data)}</Draft><Draft label="Distilled Statement">{data.distilled_statement}</Draft></div><Field label="Final Personal Impact Statement:" value={data.final_impact_statement} onChange={(value) => update("final_impact_statement", value)} rows={8}/></>}
    </div>
    <PreviousResponses data={data} stage={stage}/>
    <p className="pis-message" role="status" aria-live="polite">{message || (preview ? "Preview — responses are not saved" : saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Unable to save. Your responses remain on this screen." : "")}</p>
    <footer><button type="button" disabled={stage === 0} onClick={() => { setMessage(""); setStage((value) => Math.max(0, value - 1)); }}>Back</button><button className="pis-primary" type="button" onClick={next}>{stage === 6 ? "Complete My Statement" : "Continue"}</button></footer>
  </section>);
}
