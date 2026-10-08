"use client";

import Link from "next/link";
import { flushSync } from "react-dom";
import { StartSomethingPrintResponse } from "./StartSomethingPrintResponse";
import { Check, CircleDot, Lightbulb, Network, Printer, Sparkles, Target, Church, Coffee, BriefcaseBusiness, Dumbbell, GraduationCap, CalendarDays, MessagesSquare, Handshake, HeartHandshake, Compass, Store, BookOpen, Trees, Palette, Heart, Landmark, Rocket, Flower2, House, Users, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { StartSomethingIntroduction } from "./StartSomethingIntroduction";
import { emptyStartSomethingData, startSomethingEquivalent } from "@/lib/experiences/builder/start-something";
import { finishStartSomethingAction, saveStartSomethingDraftAction } from "@/lib/experiences/builder/start-something-actions";
import { normalizeStartSomethingEnvelope, syncStartSomethingPlaces, START_SOMETHING_NETWORK_PLACES, START_SOMETHING_PROMPTS, START_SOMETHING_STAGES, START_SOMETHING_TIMELINE, type StartSomethingData } from "@/lib/experiences/builder/start-something";

type Route = { slug: string; moduleKey: string; lessonKey: string; sectionKey: string; blockKey: string; cohortId?: string | null };
type View = "introduction" | "workflow" | "result";
const networkPlaceIcons = [Church, Coffee, BriefcaseBusiness, Dumbbell, GraduationCap, CalendarDays, MessagesSquare, Handshake, HeartHandshake, Compass, Store, BookOpen, Trees, Palette, Heart, Landmark, Rocket, Flower2, House, Users, Plus];

const timelineDescriptions = [
  "You have a spark of an idea or a need you want to respond to. Explore who it could serve and why it matters.",
  "You can picture the change you hope to see. Put that future into words so others can understand the direction.",
  "You are working out how to move toward your vision. Identify practical steps, resources, and values that will guide the work.",
  "You are inviting people to help bring the vision to life. Look for shared purpose, complementary strengths, and clear roles.",
  "You are trying the idea on a small scale. Listen to feedback, notice what works, and adjust before growing.",
  "You are ready to give the work sustained attention. Agree on responsibilities and a rhythm for continuing, learning, and reviewing progress.",
];
const ideaKeys = ["idea_summary", "idea_origin", "people_location", "redemptive_work"] as const;
const inventoryKeys = ["needs", "causes", "responses", "negative_impact", "partnerships", "success", "community_loss", "resources"] as const;
const strategyKeys = ["current_vision", "desired_future", "needed_elements", "values", "share_values", "planned_elements", "distinctiveness"] as const;
type GuidedPage =
  | { stage: 0; kind: "idea"; key: typeof ideaKeys[number] }
  | { stage: 1; kind: "inventory"; key: typeof inventoryKeys[number] }
  | { stage: 2; kind: "vision"; key: "method_strategy" | "keywords" | "vision_statement" }
  | { stage: 3; kind: "strategy"; key: typeof strategyKeys[number] }
  | { stage: 4; kind: "network_places" | "network_additional" | "network_indirect" }
  | { stage: 4; kind: "network_circle"; circle: number }
  | { stage: 5; kind: "timeline" | "two_week_plan" };

const allGuidedPages: GuidedPage[] = [
  ...ideaKeys.map((key) => ({ stage: 0 as const, kind: "idea" as const, key })),
  ...inventoryKeys.map((key) => ({ stage: 1 as const, kind: "inventory" as const, key })),
  { stage: 2, kind: "vision", key: "method_strategy" },
  { stage: 2, kind: "vision", key: "keywords" },
  { stage: 2, kind: "vision", key: "vision_statement" },
  ...strategyKeys.map((key) => ({ stage: 3 as const, kind: "strategy" as const, key })),
  { stage: 4, kind: "network_places" },
  ...Array.from({ length: 5 }, (_, circle) => ({ stage: 4 as const, kind: "network_circle" as const, circle })),
  { stage: 4, kind: "network_additional" },
  { stage: 4, kind: "network_indirect" },
  { stage: 5, kind: "timeline" },
  { stage: 5, kind: "two_week_plan" },
];

function TextField({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return <label className="start-something-field"><strong>{label}</strong><textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)}/></label>;
}

function AnswerSummary({ data, currentPage, guidedPages, printOnly = false }: { data: StartSomethingData; currentPage: number; guidedPages: GuidedPage[]; printOnly?: boolean }) {
  if (!currentPage) return null;
  const answer = (value: string) => value.trim() || "Not answered";
  const previous = guidedPages.slice(0, currentPage);
  return <details open={printOnly || undefined} className={printOnly ? "pis-previous-responses start-something-previous-responses start-something-print-response" : "pis-previous-responses start-something-previous-responses"}>
    <summary><span><strong>{printOnly ? "Your response" : "Your Previous Responses"}</strong>{!printOnly && <small>Open this anytime to remember what you shared earlier.</small>}</span><span aria-hidden="true">+</span></summary>
    <dl>
      {previous.map((page, index) => {
        if (page.kind === "idea") return <div key={index}><dt>{START_SOMETHING_PROMPTS[page.key]}</dt><dd>{answer(data.idea[page.key])}</dd></div>;
        if (page.kind === "inventory") return <div key={index}><dt>{START_SOMETHING_PROMPTS[page.key]}</dt><dd>{answer(data.inventory[page.key])}</dd></div>;
        if (page.kind === "vision") return <div key={index}><dt>{START_SOMETHING_PROMPTS[page.key]}</dt><dd>{page.key === "keywords" ? data.vision.keywords.filter(Boolean).join(" · ") || "Not answered" : answer(data.vision[page.key])}</dd></div>;
        if (page.kind === "strategy") return <div key={index}><dt>{START_SOMETHING_PROMPTS[page.key]}</dt><dd>{answer(data.strategy[page.key])}</dd></div>;
        if (page.kind === "network_places") return <div key={index}><dt>Connection settings</dt><dd>{data.network.places.join(" · ") || "Not answered"}{data.network.other ? ` · ${data.network.other}` : ""}</dd></div>;
        if (page.kind === "network_circle") { const location = data.network.locations[page.circle]; return <div key={index}><dt>{location.location || `Location ${page.circle + 1}`}</dt><dd>{location.names.filter(Boolean).join(" · ") || "No connections added"}</dd></div>; }
        if (page.kind === "network_additional") return <div key={index}><dt>Additional locations and names</dt><dd>{answer(data.network.additional_locations)}</dd></div>;
        if (page.kind === "network_indirect") return <div key={index}><dt>Indirect connections</dt><dd>{answer(data.network.indirect_connections)}</dd></div>;
        if (page.kind === "timeline") return <div key={index}><dt>Current stage</dt><dd>{answer(data.next_steps.timeline_stage)}</dd></div>;
        return <div key={index}><dt>Two-week plan</dt><dd>{answer(data.next_steps.two_week_plan)}</dd></div>;
      })}
    </dl>
  </details>;
}

export function StartSomethingExperience({ initialData, route, preview = false, returnTo = null, mode = "course" }: { initialData: unknown; route: Route; preview?: boolean; returnTo?: string | null; mode?: "standalone" | "course" }) {
  const initial = normalizeStartSomethingEnvelope(initialData);
  const [data, setData] = useState(() => ({ ...initial.draft, network: syncStartSomethingPlaces(initial.draft.network, initial.draft.network.places) }));
  const guidedPages = allGuidedPages.filter(page => page.kind !== "network_circle" || page.circle < data.network.places.length);
  const firstPageByStage = START_SOMETHING_STAGES.map((_, stage) => guidedPages.findIndex(page => page.stage === stage));
  const [printData, setPrintData] = useState<StartSomethingData | null>(null);
  const [finished, setFinished] = useState(initial.finished);
  const [currentPage, setCurrentPage] = useState(0);
  const [view, setView] = useState<View>(() => initial.finished ? "result" : startSomethingEquivalent(initial.draft, emptyStartSomethingData()) ? "introduction" : "workflow");
  const questionRef = useRef<HTMLElement>(null);
  const introductionRef = useRef<HTMLDivElement>(null);
  const previousPage = useRef({ currentPage, view });
  useEffect(() => {
    const previous = previousPage.current;
    previousPage.current = { currentPage, view };
    if (previous.currentPage === currentPage && previous.view === view) return;
    const target = view === "introduction" ? introductionRef.current : view === "workflow" ? questionRef.current : null;
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [currentPage, view]);
  const [saveState, setSaveState] = useState<"saved" | "dirty" | "saving" | "error">("saved");
  const [message, setMessage] = useState("");
  const latest = useRef(data);
  const lastSaved = useRef(JSON.stringify(data));
  const completing = useRef(false);
  const navigationConfirmed = useRef(false);
  const retakeCompletedAt = useRef<string | undefined>(undefined);
  const [finishing, setFinishing] = useState(false);
  const autosaveTimer = useRef<number | null>(null);
  const queue = useRef(Promise.resolve());
  useEffect(() => { latest.current = data; }, [data]);

  const save = useCallback((snapshot: StartSomethingData) => {
    if (preview || JSON.stringify(snapshot) === lastSaved.current) return queue.current;
    setSaveState("saving");
    queue.current = queue.current.then(async () => {
      try {
        await saveStartSomethingDraftAction(route.slug, route.moduleKey, route.lessonKey, route.sectionKey, route.blockKey, route.cohortId, snapshot);
        lastSaved.current = JSON.stringify(snapshot);
        setSaveState(JSON.stringify(latest.current) === lastSaved.current ? "saved" : "dirty");
      } catch { setSaveState("error"); throw new Error("draft-save-failed"); }
    }).catch(() => undefined);
    return queue.current;
  }, [preview, route]);

  useEffect(() => {
    if (preview || completing.current || JSON.stringify(data) === lastSaved.current) return;
    setSaveState("dirty");
    const timer = autosaveTimer.current = window.setTimeout(() => { void save(data); }, 800);
    return () => window.clearTimeout(timer);
  }, [data, preview, save]);
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => { if (!navigationConfirmed.current && ["dirty", "saving", "error"].includes(saveState)) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", protect); return () => window.removeEventListener("beforeunload", protect);
  }, [saveState]);

  const change = <S extends keyof StartSomethingData, K extends keyof StartSomethingData[S]>(section: S, key: K, value: StartSomethingData[S][K]) => { if (!completing.current) setData((current) => ({ ...current, [section]: { ...current[section], [key]: value } })); };
  function togglePlace(place: string) {
    const selected = data.network.places.includes(place);
    if (!selected && data.network.places.length >= 5) { setMessage("Choose up to 5 different places that you have connections."); return; }
    setMessage("");
    if (!completing.current) setData(current => ({ ...current, network: syncStartSomethingPlaces(current.network, selected ? current.network.places.filter(item => item !== place) : [...current.network.places, place]) }));
  }
  function updateLocation(index: number, key: "location" | "name", value: string, nameIndex = 0) {
    const locations = data.network.locations.map((location, row) => row !== index ? location : key === "location" ? { ...location, location: value } : { ...location, names: location.names.map((name, column) => column === nameIndex ? value : name) });
    change("network", "locations", locations);
  }
  async function finish(print = false, snapshot = latest.current) {
    if (completing.current) return;
    if (preview && print) { flushSync(() => setPrintData(snapshot)); window.print(); return; }
    if (preview) { setFinished({ schemaVersion: 1, sourceVersion: "start-something.v1", completedAt: new Date().toISOString(), participantMaterial: data }); setView("result"); return; }
    completing.current = true; setFinishing(true);
    if (autosaveTimer.current !== null) window.clearTimeout(autosaveTimer.current);
    setSaveState("saving"); setMessage("");
    await queue.current;
    try {
      const result = await finishStartSomethingAction(route.slug, route.moduleKey, route.lessonKey, route.sectionKey, route.blockKey, route.cohortId, snapshot, retakeCompletedAt.current);
      if (!result.completedAt) throw new Error("Completion was not confirmed.");
      lastSaved.current = JSON.stringify(snapshot); setSaveState("saved");
      if (print) {
        const completedAt = result.completedAt;
        flushSync(() => { setPrintData(snapshot); setFinished({ schemaVersion: 1, sourceVersion: "start-something.v1", completedAt, participantMaterial: snapshot }); setMessage("Your response is saved. You can print it or save it as a PDF."); });
        window.print();
        completing.current = false; setFinishing(false);
        return;
      }
      navigationConfirmed.current = true;
      setFinished({ schemaVersion: 1, sourceVersion: "start-something.v1", completedAt: result.completedAt, participantMaterial: snapshot });
      setView("result");
      completing.current = false; setFinishing(false);
    } catch { setSaveState("error"); setMessage("Your response could not be saved. Your answers remain here. Please retry the save."); completing.current = false; setFinishing(false); }
  }

  const confirmLeave = (event: React.MouseEvent<HTMLElement>) => {
    if (!["dirty", "saving", "error"].includes(saveState)) return;
    if (!window.confirm("Your latest Start Something changes may not be saved yet. Leave this page?")) event.preventDefault();
  };

  const shell = (content: React.ReactNode) => <div className={`start-something-shell is-${mode}${preview ? " is-preview" : ""}`}>{!preview && <nav className="start-something-context"><Link onClick={confirmLeave} href={returnTo ?? "/dashboard"}>← {returnTo ? "Return to Course" : "My Dashboard"}</Link></nav>}{content}<StartSomethingPrintResponse data={printData ?? (view === "result" && finished ? finished.participantMaterial : data)}/></div>;
  if (view === "result" && finished) {
    const result = finished.participantMaterial;
    return shell(<main className="start-something-result"><header><p>Start Something</p><h1>Your idea has a direction.</h1><blockquote>{result.vision.vision_statement || result.idea.idea_summary || "Your finished workbook"}</blockquote></header><section className="start-something-result-grid"><article><Lightbulb/><h2>The Idea</h2><p>{result.idea.idea_summary || "Not answered"}</p><p>{result.idea.people_location}</p></article><article><Target/><h2>Vision & Strategy</h2><p>{result.vision.method_strategy || "Not answered"}</p><div className="start-something-keywords">{result.vision.keywords.filter(Boolean).map((word) => <span key={word}>{word}</span>)}</div></article><article><CircleDot/><h2>What You See</h2><p><strong>Needs</strong><br/>{result.inventory.needs || "Not answered"}</p><p><strong>Underlying causes</strong><br/>{result.inventory.causes || "Not answered"}</p><p><strong>Possible responses</strong><br/>{result.inventory.responses || "Not answered"}</p></article><article><Sparkles/><h2>How You’ll Move</h2><p><strong>Where the vision is now</strong><br/>{result.strategy.current_vision || "Not answered"}</p><p><strong>Desired future</strong><br/>{result.strategy.desired_future || "Not answered"}</p><p><strong>Needed elements</strong><br/>{result.strategy.needed_elements || "Not answered"}</p></article><article className="is-wide"><Network/><h2>Your Network</h2><p>{result.network.places.length ? result.network.places.join(" · ") : "No settings selected"}</p><div className="start-something-network-result">{result.network.locations.filter((item) => item.location || item.names.some(Boolean)).map((item, index) => <div key={`${item.location}-${index}`}><strong>{item.location || `Location ${index + 1}`}</strong><ul>{item.names.filter(Boolean).map((name) => <li key={name}>{name}</li>)}</ul></div>)}</div>{result.network.additional_locations && <p><strong>Additional locations</strong><br/>{result.network.additional_locations}</p>}{result.network.indirect_connections && <p><strong>Indirect connections</strong><br/>{result.network.indirect_connections}</p>}</article><article><CircleDot/><h2>Current Stage</h2><p>{result.next_steps.timeline_stage || "Not selected"}</p></article><article><Sparkles/><h2>The Next Two Weeks</h2><p>{result.next_steps.two_week_plan || "Not answered"}</p></article></section>{message && <p className="start-something-save-state" role={saveState === "error" ? "alert" : "status"}>{message}</p>}<footer className="start-something-result-actions"><button type="button" onClick={() => { setData({ ...result, network: syncStartSomethingPlaces(result.network, result.network.places) }); setCurrentPage(0); setView("workflow"); }}>Review answers</button><button type="button" onClick={() => { retakeCompletedAt.current = finished.completedAt; setData(emptyStartSomethingData()); setPrintData(null); setCurrentPage(0); setView("workflow"); setMessage(""); }}>Retake assessment</button><button type="button" disabled={finishing} onClick={() => void finish(true, result)}><Printer/> {finishing ? "Saving…" : "Print assessment"}</button><button className="is-primary" type="button" onClick={() => { navigationConfirmed.current = true; window.location.assign(returnTo ?? "/dashboard"); }}>Save and close</button></footer></main>);
  }

  if (view === "introduction") {
    return shell(<div ref={introductionRef} tabIndex={-1} aria-label="Instructions" className="start-something-instructions-section"><StartSomethingIntroduction onBegin={() => {
      setCurrentPage(0);
      setView("workflow");
    }}/></div>);
  }

  const activePage = guidedPages[currentPage];
  const stage = activePage.stage;
  const stagePages = guidedPages.map((page, index) => ({ page, index })).filter(({ page }) => page.stage === stage);

  let pageContent: React.ReactNode;
  if (activePage.kind === "idea") {
    pageContent = <TextField label={START_SOMETHING_PROMPTS[activePage.key]} value={data.idea[activePage.key]} onChange={(value) => change("idea", activePage.key, value)} rows={7}/>;
  } else if (activePage.kind === "inventory") {
    pageContent = <TextField label={START_SOMETHING_PROMPTS[activePage.key]} value={data.inventory[activePage.key]} onChange={(value) => change("inventory", activePage.key, value)} rows={7}/>;
  } else if (activePage.kind === "vision" && activePage.key === "keywords") {
    pageContent = <><fieldset className="start-something-keyword-fields"><legend>{START_SOMETHING_PROMPTS.keywords}</legend>{data.vision.keywords.map((word, index) => <label key={index}>Keyword {index + 1}<input value={word} maxLength={80} onChange={(event) => change("vision", "keywords", data.vision.keywords.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}/></label>)}</fieldset><aside className="start-something-live-vision"><span>Build your vision</span><p>{data.vision.method_strategy || "Your method and strategy will appear here."}</p><div>{data.vision.keywords.filter(Boolean).map((word) => <span key={word}>{word}</span>)}</div></aside></>;
  } else if (activePage.kind === "vision") {
    const key = activePage.key as "method_strategy" | "vision_statement";
    pageContent = <TextField label={START_SOMETHING_PROMPTS[key]} value={data.vision[key]} onChange={(value) => change("vision", key, value)} rows={7}/>;
  } else if (activePage.kind === "strategy") {
    pageContent = <TextField label={START_SOMETHING_PROMPTS[activePage.key]} value={data.strategy[activePage.key]} onChange={(value) => change("strategy", activePage.key, value)} rows={7}/>;
  } else if (activePage.kind === "network_places") {
    pageContent = <><fieldset className="start-something-place-picker"><legend>Choose up to 5 different places where you have connections.</legend><p aria-live="polite">{data.network.places.length} of 5 selected</p><div>{START_SOMETHING_NETWORK_PLACES.map((place, index) => {
      const Icon = networkPlaceIcons[index];
      const selected = data.network.places.includes(place);
      return <button type="button" role="checkbox" aria-checked={selected} className={selected ? "is-selected" : ""} onClick={() => togglePlace(place)} key={place}><Icon aria-hidden="true"/><span>{place}</span>{selected && <Check className="start-something-place-check" aria-hidden="true"/>}</button>;
    })}</div></fieldset>{data.network.places.includes("Other") && <TextField label="Other location" value={data.network.other} onChange={(value) => { if (!completing.current) setData(current => ({ ...current, network: syncStartSomethingPlaces(current.network, current.network.places, value) })); }}/>}</>;
  } else if (activePage.kind === "network_circle") {
    const location = data.network.locations[activePage.circle];
    pageContent = <><h2 className="start-something-network-title">Add the people in this setting who might be interested in hearing about your mission.</h2><div className="start-something-network-map is-single"><fieldset className="start-something-network-orbit"><legend>Connection circle {activePage.circle + 1}</legend><div className="start-something-location-node"><label>Location {activePage.circle + 1}<textarea rows={3} value={location.location} placeholder="Name this setting" onChange={(event) => updateLocation(activePage.circle, "location", event.target.value)}/></label></div><div className="start-something-connection-nodes">{location.names.map((name, nameIndex) => <label key={nameIndex}>Connection {nameIndex + 1}<textarea rows={2} value={name} placeholder="Add a person" onChange={(event) => updateLocation(activePage.circle, "name", event.target.value, nameIndex)}/></label>)}</div></fieldset></div></>;
  } else if (activePage.kind === "network_additional") {
    pageContent = <TextField label={'If you had more than 5 locations (or selected "other"), include those locations and names here.'} value={data.network.additional_locations} onChange={(value) => change("network", "additional_locations", value)} rows={7}/>;
  } else if (activePage.kind === "network_indirect") {
    pageContent = <TextField label="Is there anyone else you can think of who may be connected to people you know?" value={data.network.indirect_connections} onChange={(value) => change("network", "indirect_connections", value)} rows={7}/>;
  } else if (activePage.kind === "timeline") {
    pageContent = <fieldset className="start-something-timeline"><legend>Identify where you are on this rough timeline. Place yourself, then consider what should happen next.</legend><div>{START_SOMETHING_TIMELINE.map((item, index) => <div className="start-something-timeline-choice" key={item}><label className={data.next_steps.timeline_stage === item ? "is-selected" : ""}><input type="radio" name="start-something-stage" checked={data.next_steps.timeline_stage === item} onChange={() => change("next_steps", "timeline_stage", item)}/><span>{index + 1}</span><strong>{item.replace(/^\d+\. /, "")}</strong></label><details className="start-something-timeline-help"><summary><span aria-hidden="true">+</span><span className="sr-only">About the {item.replace(/^\d+\. /, "")} stage</span></summary><p>{timelineDescriptions[index]}</p></details></div>)}</div></fieldset>;
  } else {
    pageContent = <TextField label="What is your plan in the next two weeks to make your idea start to come to life—or move to the next stage?" value={data.next_steps.two_week_plan} onChange={(value) => change("next_steps", "two_week_plan", value)} rows={7}/>;
  }

  return shell(<main className="start-something-workflow">
    <header className="start-something-heading"><span>Start Something</span><h1 id="start-something-stage-heading" tabIndex={-1}>{START_SOMETHING_STAGES[stage]}</h1><p>Move your idea toward thoughtful, meaningful action—one honest reflection at a time.</p></header>
    <nav className="start-something-mobile-progress" aria-label="Current assessment stage">
      <span aria-hidden="true">{stage + 1}</span>
      <label><span className="sr-only">Assessment section</span><select value={stage} onChange={(event) => event.target.value === "instructions" ? setView("introduction") : setCurrentPage(firstPageByStage[Number(event.target.value)])}><option value="instructions">Instructions</option>{START_SOMETHING_STAGES.map((name, index) => <option key={name} value={index}>{name}</option>)}</select></label>
      <small>of {START_SOMETHING_STAGES.length}</small>
    </nav>
    <nav className="start-something-progress" aria-label="Guided experience progress"><button type="button" className="start-something-instructions-link" onClick={() => setView("introduction")}>Instructions</button><ol>{START_SOMETHING_STAGES.map((name, index) => {
      const pages = guidedPages.map((page, pageIndex) => ({ page, pageIndex })).filter(({ page }) => page.stage === index);
      const nextStepPages = index === 4 ? guidedPages.map((page, pageIndex) => ({ page, pageIndex })).filter(({ page }) => page.stage === 5) : [];
      const trackPages = index === 5 ? [] : [...pages, ...nextStepPages];
      return <li key={name} style={index === 5 ? { flex: "0 0 94px" } : { flex: trackPages.length + 1 }} className={index === stage ? "is-current" : index < stage ? "is-visited" : "is-upcoming"}><button type="button" onClick={() => setCurrentPage(firstPageByStage[index])} aria-current={index === stage ? "step" : undefined}><span>{index < stage ? <Check/> : index + 1}</span>{name}</button>{trackPages.length > 0 && <div className="start-something-substeps" aria-label={`${name} questions`}>{trackPages.map(({ pageIndex }, substep) => <button type="button" key={pageIndex} className={pageIndex === currentPage ? "is-current" : pageIndex < currentPage ? "is-complete" : ""} onClick={() => setCurrentPage(pageIndex)} aria-label={`Question ${substep + 1} of ${trackPages.length} after ${name}`}/>)}</div>}</li>;
    })}</ol></nav>
    <p className="start-something-question-count">Question {stagePages.findIndex(({ index }) => index === currentPage) + 1} of {stagePages.length}</p>
    <section ref={questionRef} tabIndex={-1} aria-label={`${START_SOMETHING_STAGES[stage]} question ${stagePages.findIndex(({ index }) => index === currentPage) + 1}`} className={`start-something-stage is-stage-${stage}`}>{pageContent}</section>
    <AnswerSummary data={data} currentPage={currentPage} guidedPages={guidedPages}/>
    <p className="start-something-save-state" role="status">{preview ? "Preview — nothing is saved" : saveState === "saving" ? "Saving your draft…" : saveState === "dirty" ? "Unsaved changes" : saveState === "error" ? "Save failed — your answers remain here. Retry Save." : "Draft saved"} {message}</p>
    <footer className="start-something-navigation"><button type="button" onClick={() => currentPage === 0 ? setView("introduction") : setCurrentPage((value) => value - 1)}>Back</button>{!preview && <button type="button" disabled={saveState === "saving" || saveState === "saved"} onClick={() => void save(latest.current)}>{saveState === "error" ? "Retry Save" : "Save Draft"}</button>}{currentPage < guidedPages.length - 1 ? <button className="is-primary" type="button" onClick={() => setCurrentPage((value) => value + 1)}>Next step →</button> : <button className="is-primary" type="button" disabled={finishing} onClick={() => void finish()}>{finishing ? "Saving…" : "Save my response"}</button>}</footer>
  </main>);
}
