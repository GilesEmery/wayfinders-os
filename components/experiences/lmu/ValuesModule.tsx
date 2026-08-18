"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { LMU_ORIGINAL_EXPERIENCE_ID } from "@/lib/experiences/lmu/original-journey";
import type { LMUInstructionalMedia } from "@/lib/experiences/lmu/types";
import { lmuValues } from "@/modules/lmu/values/curriculum";
import { completeValues, emptyValuesResponse, saveValuesResponse, selectedLMUValues } from "@/modules/lmu/values/storage";
import type { PathwayUValue, ValuesResponse, ValuesScreen } from "@/modules/lmu/values/types";
import { LMUBadgeIcon } from "./icons/badge/LMUBadgeIcon";
import { LMUInstructionalVideo } from "./LMUInstructionalVideo";
import { LMUScreenHeading } from "./LMUScreenHeading";
import { LMUShell } from "./LMUShell";
import { MapAccent } from "./MapAccent";
import { ModuleStartOverControl } from "./ModuleStartOverControl";
import { useOriginalProgress } from "./useOriginalProgress";
import { usePageStart } from "./usePageStart";

const normalize = (value: string) => value.trim().toLocaleLowerCase();

export function ValuesModule({ media }: { media?: Record<string, LMUInstructionalMedia> }) {
  const progress = useOriginalProgress();
  const moduleProgress = progress.find((item) => item.moduleId === "values");
  const response: ValuesResponse = moduleProgress ? { ...emptyValuesResponse(), ...(moduleProgress.responses as unknown as Partial<ValuesResponse>) } : emptyValuesResponse();
  const screen = response.resumeScreen;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  usePageStart(screen, headingRef);

  function save(next: ValuesResponse) { saveValuesResponse(next); }
  function go(nextScreen: ValuesScreen, patch: Partial<ValuesResponse> = {}) { save({ ...response, ...patch, resumeScreen: nextScreen }); }
  function updatePathwayU(slot: 1 | 2, input: string) {
    const id = `pathwayu-${slot}` as PathwayUValue["id"];
    const others = response.pathwayUValues.filter((value) => value.id !== id);
    const label = input.slice(0, 100);
    const pathwayUValues = label.trim() ? [...others, { id, label, source: "pathwayu" as const, sourceMode: "manual" as const }].sort((a, b) => a.id.localeCompare(b.id)) : others;
    save({ ...response, pathwayUValues, resumeScreen: "selection", finalizedAt: undefined });
  }
  function toggleValue(id: string) {
    const selected = response.selectedValueIds.includes(id);
    if (!selected && response.selectedValueIds.length === 5) return;
    const selectedValueIds = selected ? response.selectedValueIds.filter((valueId) => valueId !== id) : [...response.selectedValueIds, id];
    save({ ...response, selectedValueIds, finalizedAt: undefined, resumeScreen: "selection" });
  }
  function confirm() { if (response.selectedValueIds.length === 5) go("final", { finalizedAt: new Date().toISOString() }); }
  function finish() { completeValues(response); router.push("/experiences/life-mapping-u/original"); }

  const selectedValues = selectedLMUValues(response);
  const duplicateIds = new Set(response.pathwayUValues.filter((pathwayValue) => selectedValues.some((value) => normalize(value.displayLabel) === normalize(pathwayValue.label))).map((value) => value.id));
  const startOver = <ModuleStartOverControl experienceId={LMU_ORIGINAL_EXPERIENCE_ID} moduleId="values" moduleHref="/experiences/life-mapping-u/module/values" />;

  return <LMUShell context="Values" theme="dark" journeyHref="/experiences/life-mapping-u/original">
    {screen === "introduction" && <main className="success-intro values-intro"><section className="success-intro-copy teammates-intro-copy"><p className="eyebrow eyebrow-rule">Values</p><h1 ref={headingRef} tabIndex={-1}>Name what matters most to you.</h1><p className="success-intro-accent">Clarify the values that orient meaningful work and life.</p>{media?.intro && <LMUInstructionalVideo {...media.intro} />}<div className="skills-reminders"><p className="eyebrow">Important Reminders</p><p>This section helps you name your core values in work and life.</p><p>Two values will eventually carry over from your PathwayU assessment. For now, you may enter those two values yourself if you already know them. These fields are optional.</p><p>You will then choose five additional values directly in Life Mapping U. Select the five values that best align with your vision for meaningful work and life.</p></div><button className="button button-primary" type="button" onClick={() => go("selection")}><span>Begin Values</span><span aria-hidden="true">→</span></button>{startOver}</section><aside className="success-memory-panel teammates-intro-badge"><MapAccent density="tight" position="center" opacity={0.18} /><div><LMUBadgeIcon name="values" state="current" size={112} label="Values" context="dark" /><p className="eyebrow">A compass for meaningful choices</p><p>Your values help orient the work and life you want to build.</p></div></aside></main>}

    {screen === "selection" && <main className="teammates-shell values-selection"><div className="teammates-screen-heading"><LMUBadgeIcon name="values" state="current" size={72} label="Values" /><LMUScreenHeading eyebrow="Values" title="Which five values matter most to you?" description="Choose the five values that most closely align with the kind of work and life you want to build." headingRef={headingRef} /></div><section className="pathway-values"><p className="eyebrow">Values From PathwayU · Optional</p><h2>Carried-over values</h2><p>Two values will eventually carry over automatically from your PathwayU assessment. For now, if you already know them, you may enter them below.</p><div>{([1, 2] as const).map((slot) => { const id = `pathwayu-${slot}`; return <label key={id}>PathwayU Value {slot}<input maxLength={100} value={response.pathwayUValues.find((value) => value.id === id)?.label ?? ""} onChange={(event) => updatePathwayU(slot, event.target.value)} /></label>; })}</div></section><div className="values-list-heading"><p className="eyebrow">Your Five LMU Values</p><p>PathwayU entries do not count toward these five selections.</p></div><div className="teammates-selected-count" role="status"><strong>Selected {response.selectedValueIds.length} of 5</strong><span>{response.selectedValueIds.length === 5 ? "Your five are ready to review." : `Choose ${5 - response.selectedValueIds.length} more.`}</span></div><section className="pain-point-grid" aria-label="Life Mapping U values">{lmuValues.map((value) => { const index = response.selectedValueIds.indexOf(value.id); const selected = index >= 0; return <button key={value.id} type="button" className={selected ? "is-selected" : ""} aria-pressed={selected} aria-label={`${value.displayLabel}, ${selected ? `selected ${index + 1} of 5` : "not selected"}`} onClick={() => toggleValue(value.id)}><span aria-hidden="true">{selected ? index + 1 : ""}</span>{value.displayLabel}</button>; })}</section><div className="teammates-actions"><button className="button button-primary" type="button" disabled={response.selectedValueIds.length !== 5} onClick={() => go("review")}><span>Review My Values</span><span aria-hidden="true">→</span></button></div>{startOver}</main>}

    {screen === "review" && <main className="teammates-shell values-review"><LMUScreenHeading eyebrow="Values" title="Your Values" description="Review the values you carried over and the five you selected directly in Life Mapping U." headingRef={headingRef} />{response.pathwayUValues.length > 0 && <section className="values-source-group"><p className="eyebrow">From PathwayU</p><ul>{response.pathwayUValues.map((value) => <li key={value.id}><LMUBadgeIcon name="values" state="light" size={42} label="PathwayU value" /><div><strong>{value.label}</strong>{duplicateIds.has(value.id) && <small>This value also appears in your LMU selections.</small>}</div></li>)}</ul></section>}<section className="values-source-group"><p className="eyebrow">Selected in Life Mapping U</p><ol>{selectedValues.map((value, index) => <li key={value.id}><span>{String(index + 1).padStart(2, "0")}</span><LMUBadgeIcon name="values" state="active" size={48} label="Values" /><strong>{value.displayLabel}</strong></li>)}</ol></section><div className="teammates-actions"><button className="story-cancel" type="button" onClick={() => go("selection")}>Change My Choices</button><button className="button button-primary" type="button" onClick={confirm}><span>Confirm My Values</span><span aria-hidden="true">✓</span></button></div>{startOver}</main>}

    {screen === "final" && <main className="teammates-shell values-final"><LMUScreenHeading eyebrow="Values" title="Your Values" description="These are the values you identified as meaningful guides for your work and life." headingRef={headingRef} />{response.pathwayUValues.length > 0 && <section className="values-source-group"><p className="eyebrow">From PathwayU</p><ul>{response.pathwayUValues.map((value) => <li key={value.id}><LMUBadgeIcon name="values" state="light" size={42} label="PathwayU value" /><strong>{value.label}</strong></li>)}</ul></section>}<section className="values-source-group"><p className="eyebrow">Your Five Values</p><ol>{selectedValues.map((value, index) => <li key={value.id}><span>{String(index + 1).padStart(2, "0")}</span><LMUBadgeIcon name="values" state="active" size={52} label="Values" /><strong>{value.displayLabel}</strong></li>)}</ol></section><button className="button button-primary" type="button" onClick={finish}><span>Finish Section</span><span aria-hidden="true">→</span></button>{startOver}</main>}
  </LMUShell>;
}
