"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LMUInstructionalMedia } from "@/lib/experiences/lmu/types";
import { LMU_ORIGINAL_EXPERIENCE_ID } from "@/lib/experiences/lmu/original-journey";
import { teammatePainPointById, teammatePainPoints } from "@/modules/lmu/teammates/curriculum";
import { completeTeammates, emptyTeammatesResponse, readTeammatesResponse, saveTeammatesResponse } from "@/modules/lmu/teammates/storage";
import type { CustomPainPoint, TeammateAttribute, TeammatesResponse, TeammatesScreen } from "@/modules/lmu/teammates/types";
import { supervisorPainPointById, supervisorPainPoints } from "@/modules/lmu/supervisor/curriculum";
import { completeSupervisor, emptySupervisorResponse, readSupervisorResponse, saveSupervisorResponse } from "@/modules/lmu/supervisor/storage";
import { LMUBadgeIcon } from "./icons/badge/LMUBadgeIcon";
import { LMUInstructionalVideo } from "./LMUInstructionalVideo";
import { LMUChoiceIndicator } from "./LMUChoiceIndicator";
import { LMUScreenHeading } from "./LMUScreenHeading";
import { LMUShell } from "./LMUShell";
import { MapAccent } from "./MapAccent";
import { ModuleStartOverControl } from "./ModuleStartOverControl";
import { useOriginalProgress } from "./useOriginalProgress";
import { usePageStart } from "./usePageStart";
import { LMUFinalMoveControls, LMUFinalSelectionGroup, LMUFinalSelectionRow } from "./LMUFinalSelectionReview";

const normalize = (value: string) => value.trim().toLocaleLowerCase();

export function TeammatesModule({ media }: { media?: Record<string, LMUInstructionalMedia> }) { return <PreferencePeopleModule media={media} variant="teammates" />; }
export function SupervisorModule({ media }: { media?: Record<string, LMUInstructionalMedia> }) { return <PreferencePeopleModule media={media} variant="supervisor" />; }

function PreferencePeopleModule({ media, variant }: { media?: Record<string, LMUInstructionalMedia>; variant: "teammates" | "supervisor" }) {
  const isSupervisor = variant === "supervisor";
  const moduleId = isSupervisor ? "supervisor" : "teammates";
  const moduleTitle = isSupervisor ? "Supervisor" : "Teammates";
  const iconName = isSupervisor ? "supervisor" as const : "teammates" as const;
  const painPoints = isSupervisor ? supervisorPainPoints : teammatePainPoints;
  const painPointById = isSupervisor ? supervisorPainPointById : teammatePainPointById;
  const progress = useOriginalProgress();
  const moduleProgress = progress.find((item) => item.moduleId === moduleId);
  const emptyResponse = isSupervisor ? emptySupervisorResponse() : emptyTeammatesResponse();
  const storedResponse = moduleProgress ? { ...emptyResponse, ...(moduleProgress.responses as unknown as Partial<TeammatesResponse>) } : emptyResponse;
  const response: TeammatesResponse = {
    ...storedResponse,
    selectedPainPoints: storedResponse.selectedPainPoints.map((painPoint) => painPoint.type === "curriculum" ? { ...painPoint, label: painPointById.get(painPoint.id)?.displayLabel ?? painPoint.label } : painPoint),
    attributes: storedResponse.attributes.map((attribute) => attribute.sourceType === "curriculum" ? { ...attribute, sourcePainPointLabel: painPointById.get(attribute.sourcePainPointId)?.displayLabel ?? attribute.sourcePainPointLabel } : attribute),
  };
  const screen = response.resumeScreen;
  const [customDrafts, setCustomDrafts] = useState<[string | null, string | null]>([null, null]);
  const [customError, setCustomError] = useState("");
  const [pendingCustom, setPendingCustom] = useState<CustomPainPoint | null>(null);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  usePageStart(`${screen}-${response.writingIndex}`, headingRef);

  function save(next: TeammatesResponse) { if (isSupervisor) saveSupervisorResponse(next); else saveTeammatesResponse(next); }
  function go(nextScreen: TeammatesScreen, patch: Partial<TeammatesResponse> = {}) { save({ ...response, ...patch, resumeScreen: nextScreen }); setExamplesOpen(false); }

  function toggleCurriculum(id: string, label: string) {
    const exists = response.selectedPainPoints.some((item) => item.id === id);
    if (!exists && response.selectedPainPoints.length === 5) { setCustomError("You already have five pain points. Remove one before selecting another."); return; }
    const selectedPainPoints = exists ? response.selectedPainPoints.filter((item) => item.id !== id) : [...response.selectedPainPoints, { id, label, type: "curriculum" as const }];
    setCustomError("");
    save({ ...response, selectedPainPoints, attributes: response.attributes.filter((attribute) => selectedPainPoints.some((item) => item.id === attribute.sourcePainPointId)), finalizedAttributeIds: [], finalizedAt: undefined, resumeScreen: "selection" });
  }

  function submitCustom(slot: number) {
    const label = (customDrafts[slot] ?? response.customPainPoints[slot]?.label ?? "").trim();
    if (!label) { setCustomError("Enter a pain point before adding it."); return; }
    if (label.length > 100) { setCustomError("Keep custom pain points to 100 characters or fewer."); return; }
    const duplicateCurriculum = painPoints.find((item) => normalize(item.displayLabel) === normalize(label) || normalize(item.originalLabel) === normalize(label));
    if (duplicateCurriculum) { setCustomError(`“${duplicateCurriculum.label}” is already in the list. Select that option instead.`); return; }
    if (response.customPainPoints.some((item, index) => index !== slot && normalize(item.label) === normalize(label))) { setCustomError("Your two custom pain points need to be different."); return; }
    const existing = response.customPainPoints[slot];
    const custom = { id: existing?.id ?? ["custom-1", "custom-2"].find((id) => !response.customPainPoints.some((item) => item.id === id))!, label };
    if (existing) {
      const customPainPoints = response.customPainPoints.map((item, index) => index === slot ? custom : item);
      const selectedPainPoints = response.selectedPainPoints.map((item) => item.id === existing.id ? { ...item, label } : item);
      const attributes = response.attributes.map((item) => item.sourcePainPointId === existing.id ? { ...item, sourcePainPointLabel: label } : item);
      save({ ...response, customPainPoints, selectedPainPoints, attributes, finalizedAttributeIds: [], finalizedAt: undefined });
    } else if (response.selectedPainPoints.length === 5) setPendingCustom(custom);
    else addCustom(custom);
    setCustomError("");
  }

  function addCustom(custom: CustomPainPoint, replaceId?: string) {
    const selectedPainPoints = [...response.selectedPainPoints];
    const replacementIndex = replaceId ? selectedPainPoints.findIndex((item) => item.id === replaceId) : -1;
    if (replacementIndex >= 0) selectedPainPoints[replacementIndex] = { ...custom, type: "custom" as const };
    else selectedPainPoints.push({ ...custom, type: "custom" as const });
    const customPainPoints = [...response.customPainPoints.filter((item) => item.id !== custom.id && item.id !== replaceId), custom].slice(0, 2);
    save({ ...response, customPainPoints, selectedPainPoints, attributes: response.attributes.filter((item) => selectedPainPoints.some((selected) => selected.id === item.sourcePainPointId)), finalizedAttributeIds: [], finalizedAt: undefined, resumeScreen: "selection" });
    setCustomDrafts([customPainPoints[0]?.label ?? "", customPainPoints[1]?.label ?? ""]);
    setPendingCustom(null);
  }

  function removeCustom(slot: number) {
    const custom = response.customPainPoints[slot]; if (!custom) return;
    const customPainPoints = response.customPainPoints.filter((_, index) => index !== slot);
    const selectedPainPoints = response.selectedPainPoints.filter((item) => item.id !== custom.id);
    setCustomDrafts([customPainPoints[0]?.label ?? "", customPainPoints[1]?.label ?? ""]);
    save({ ...response, customPainPoints, selectedPainPoints, attributes: response.attributes.filter((item) => item.sourcePainPointId !== custom.id), finalizedAttributeIds: [], finalizedAt: undefined });
  }

  function beginWriting() {
    const attributes = response.selectedPainPoints.map((painPoint, index) => response.attributes.find((item) => item.sourcePainPointId === painPoint.id) ?? { id: `attribute-${painPoint.id}`, sourcePainPointId: painPoint.id, sourcePainPointLabel: painPoint.label, sourceType: painPoint.type, positiveAttribute: "", description: "", order: index });
    go("writing", { attributes, writingIndex: 0 });
  }

  function updateAttribute(patch: Partial<TeammateAttribute>) {
    const painPoint = response.selectedPainPoints[response.writingIndex]; if (!painPoint) return;
    save({ ...response, attributes: response.attributes.map((item) => item.sourcePainPointId === painPoint.id ? { ...item, ...patch } : item), resumeScreen: "writing" });
  }

  function nextAttribute() {
    const attribute = response.attributes.find((item) => item.sourcePainPointId === response.selectedPainPoints[response.writingIndex]?.id);
    if (!attribute?.positiveAttribute.trim()) return;
    if (response.writingIndex === 4) go("review", { finalizedAttributeIds: [...response.attributes].sort((a, b) => a.order - b.order).map((item) => item.id) });
    else { save({ ...response, writingIndex: response.writingIndex + 1, resumeScreen: "writing" }); setExamplesOpen(false); }
  }

  function moveAttribute(index: number, direction: -1 | 1) {
    const ids = [...response.finalizedAttributeIds]; const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    save({ ...response, finalizedAttributeIds: ids, finalizedAt: undefined, resumeScreen: "review" });
  }

  function finalize() { if (response.finalizedAttributeIds.length === 5) go("final", { finalizedAt: new Date().toISOString() }); }
  function finish() { if (isSupervisor) completeSupervisor(readSupervisorResponse()); else completeTeammates(readTeammatesResponse()); router.push("/experiences/life-mapping-u/original"); }

  const teammateSteps: TeammatesScreen[] = ["introduction", "selection", "confirmation", "writing", "review", "final"];
  function sectionBack() {
    if (screen === "writing" && response.writingIndex > 0) { save({ ...response, writingIndex: response.writingIndex - 1 }); setExamplesOpen(false); return; }
    if (screen === "review") { go("writing", { writingIndex: 0 }); return; }
    if (screen !== "introduction") go(teammateSteps[teammateSteps.indexOf(screen) - 1]);
  }

  const startOver = <ModuleStartOverControl experienceId={LMU_ORIGINAL_EXPERIENCE_ID} moduleId={moduleId} moduleHref={`/experiences/life-mapping-u/module/${moduleId}`} screen={screen} onBack={screen === "introduction" ? undefined : sectionBack} backLabel={screen === "writing" && response.writingIndex > 0 ? "Back" : undefined} onResetComplete={() => { setCustomDrafts([null, null]); setPendingCustom(null); }} />;
  const currentPainPoint = response.selectedPainPoints[response.writingIndex];
  const currentAttribute = response.attributes.find((item) => item.sourcePainPointId === currentPainPoint?.id);
  const promptData = currentPainPoint?.type === "curriculum" ? painPointById.get(currentPainPoint.id) : undefined;

  return <LMUShell context={moduleTitle} theme="dark" journeyHref="/experiences/life-mapping-u/original" onInternalBack={screen === "introduction" ? undefined : sectionBack}>
    {screen === "introduction" && <main className="success-intro teammates-intro"><section className="success-intro-copy teammates-intro-copy"><p className="eyebrow eyebrow-rule">{moduleTitle}</p><h1 ref={headingRef} tabIndex={-1}>{isSupervisor ? "Understand the kind of leadership that helps you do your best work." : "Understand the kind of teammates who help you do your best work."}</h1><p className="success-intro-accent">{isSupervisor ? "Healthy leadership helps you grow, contribute well, and work effectively." : "Healthy teamwork starts with recognizing what helps you contribute well."}</p>{media?.intro && <LMUInstructionalVideo {...media.intro} />}<div className="skills-reminders"><p className="eyebrow">Important Reminders</p>{isSupervisor ? <><p>Think about leadership: what helps you grow and what gets in the way.</p><p>Choose five difficult supervisor traits or leadership conditions you have experienced. Then rewrite each one as a positive quality or behavior you would want in a supervisor.</p><p><strong>Example:</strong> “Avoids conflict” can become “Proactively addresses issues with clarity and care.”</p></> : <><p>Begin to identify the kind of teammate traits and work culture where you do your best work.</p><p>First, choose five teammate “pain point” behaviors that are especially difficult for you. Then you will turn each one around and describe the positive quality you want to experience instead.</p><p><strong>Example:</strong> “Closed to new ideas” can become “Open to collaboration.”</p></>}</div><div className="skills-intro-instructions"><p className="eyebrow">Why This Matters</p><p>{isSupervisor ? "Gaining clarity on your leadership preferences can help you discern healthy environments and navigate conflict wisely." : "These reflections help you understand what healthy teamwork looks like for you and give you language to recognize and advocate for the kind of environment where you work best."}</p></div><button className="button button-primary" type="button" onClick={() => go("selection")}><span>Begin {moduleTitle}</span><span aria-hidden="true">→</span></button>{startOver}</section><aside className="success-memory-panel teammates-intro-badge"><MapAccent density="tight" position="center" opacity={0.18} /><div><LMUBadgeIcon name={iconName} state="current" size={112} label={moduleTitle} context="dark" /><p className="eyebrow">{isSupervisor ? "Leadership that provides direction and support" : "The people I work alongside"}</p><p>{isSupervisor ? "Notice the leadership behaviors that help you grow and do your best work." : "Notice the behaviors that help you work well, contribute well, and stay healthy in a team."}</p></div></aside></main>}

    {screen === "selection" && <main className="teammates-shell"><div className="teammates-screen-heading"><LMUBadgeIcon name={iconName} state="current" size={72} label={moduleTitle} /><LMUScreenHeading eyebrow={moduleTitle} title={isSupervisor ? "What is difficult for you in a supervisor or leadership environment?" : "What is difficult for you in a teammate?"} description={isSupervisor ? "Think about leadership behaviors or conditions that make it harder for you to grow, contribute well, or do your best work. Choose five that stand out most." : "Think about behaviors that make it harder for you to work well, communicate well, or contribute at your best. Choose five that stand out most."} headingRef={headingRef} /></div><div className="teammates-selected-count" role="status"><strong>Selected {response.selectedPainPoints.length} of 5</strong><span>{response.selectedPainPoints.length === 5 ? "Your five are ready to review." : `Choose ${5 - response.selectedPainPoints.length} more.`}</span></div><section className="pain-point-grid lmu-choice-list lmu-choice-list--ordered" aria-label={`${moduleTitle} pain points`}>{painPoints.map((painPoint) => { const selectedIndex = response.selectedPainPoints.findIndex((item) => item.id === painPoint.id); const selected = selectedIndex >= 0; return <button key={painPoint.id} type="button" className={`lmu-response-row lmu-response-row--ordered${selected ? " is-selected" : ""}`} aria-pressed={selected} aria-label={`${painPoint.label}, ${selected ? `selected ${selectedIndex + 1} of 5` : "not selected"}`} onClick={() => toggleCurriculum(painPoint.id, painPoint.label)}><LMUChoiceIndicator selected={selected} order={selectedIndex + 1} />{painPoint.label}</button>; })}</section><section className="custom-pain-points"><p className="eyebrow">Add your own · Optional</p><p>You may add up to two {isSupervisor ? "supervisor " : ""}pain points that are not represented above.</p>{[0, 1].map((slot) => { const custom = response.customPainPoints[slot]; const selectionIndex = custom ? response.selectedPainPoints.findIndex((item) => item.id === custom.id) : -1; return <div key={slot}><label htmlFor={`${moduleId}-custom-pain-${slot}`}>Other {slot + 1}{selectionIndex >= 0 && <span className="custom-selection-number">{selectionIndex + 1}</span>}</label><input id={`${moduleId}-custom-pain-${slot}`} maxLength={100} value={customDrafts[slot] ?? custom?.label ?? ""} onChange={(event) => setCustomDrafts((current) => { const next: [string | null, string | null] = [...current]; next[slot] = event.target.value; return next; })} /><button type="button" onClick={() => submitCustom(slot)}>{custom ? "Update" : "Add"}</button>{custom && <button type="button" onClick={() => removeCustom(slot)}>Remove</button>}</div>; })}{customError && <p className="teammates-error" role="alert">{customError}</p>}{pendingCustom && <div className="custom-replacement"><p className="eyebrow">Choose a replacement</p><h2>Which selection should “{pendingCustom.label}” replace?</h2>{response.selectedPainPoints.map((item, index) => <button key={item.id} type="button" onClick={() => addCustom(pendingCustom, item.id)}><span>{String(index + 1).padStart(2, "0")}</span>{item.label}</button>)}<button className="review-replace-cancel" type="button" onClick={() => setPendingCustom(null)}>Cancel</button></div>}</section><div className="teammates-actions"><button className="button button-primary" type="button" disabled={response.selectedPainPoints.length !== 5} onClick={() => go("confirmation")}><span>Review My Five</span><span aria-hidden="true">→</span></button></div>{startOver}</main>}

    {screen === "confirmation" && <main className="teammates-shell teammates-confirm"><LMUScreenHeading eyebrow={moduleTitle} title="The Five That Stand Out" description={`These five pain points will guide the positive ${isSupervisor ? "leadership" : "teammate"} qualities you describe next.`} headingRef={headingRef} /><ol>{response.selectedPainPoints.map((item, index) => <li key={item.id}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.label}</strong></li>)}</ol><div className="teammates-actions"><button className="story-cancel" type="button" onClick={() => go("selection")}>Change My Choices</button><button className="button button-primary" type="button" onClick={beginWriting}><span>Continue</span><span aria-hidden="true">→</span></button></div>{startOver}</main>}

    {screen === "writing" && currentPainPoint && currentAttribute && <main className="teammates-shell teammate-writing"><div className="teammates-screen-heading"><LMUBadgeIcon name={iconName} state="current" size={72} label={moduleTitle} /><LMUScreenHeading eyebrow={`${moduleTitle} · ${response.writingIndex + 1} of 5`} title="What do you want to experience instead?" description={`Each pain point tells you something about the ${isSupervisor ? "leadership" : "teammate"} behavior that matters to you. Put positive language around what you want to see instead.`} headingRef={headingRef} /></div><section className="teammate-writing-card"><p className="eyebrow">Pain Point</p><h2>{currentPainPoint.label}</h2><p className="teammate-writing-prompt">Think about what you would want to experience instead.</p>{promptData && <><button className="teammate-example-toggle" type="button" aria-expanded={examplesOpen} onClick={() => setExamplesOpen((open) => !open)}>{examplesOpen ? "− Hide Examples" : "+ See Examples"}</button>{examplesOpen && <div className="teammate-examples"><p className="eyebrow">A Couple Examples</p>{promptData.examplePrompts.map((prompt) => <p key={prompt}>“{prompt}”</p>)}</div>}</>}<label>What I Desire in a {moduleTitle === "Supervisor" ? "Supervisor" : "Teammate"}<textarea rows={7} maxLength={500} value={currentAttribute.positiveAttribute} onChange={(event) => updateAttribute({ positiveAttribute: event.target.value, description: "" })} placeholder={`Describe the quality or behavior you want to experience in a ${isSupervisor ? "supervisor" : "teammate"}.`} /></label></section><div className="teammates-actions"><button className="story-cancel" type="button" onClick={() => response.writingIndex ? (save({ ...response, writingIndex: response.writingIndex - 1 }), setExamplesOpen(false)) : go("confirmation")}>← Back</button><button className="button button-primary" type="button" disabled={!currentAttribute.positiveAttribute.trim()} onClick={nextAttribute}><span>{response.writingIndex === 4 ? "Review My Attributes" : "Continue"}</span><span aria-hidden="true">→</span></button></div>{startOver}</main>}

    {screen === "review" && <main className="teammates-shell"><LMUScreenHeading eyebrow={moduleTitle} title={isSupervisor ? "What I Desire in a Supervisor" : "Your Teammate Attributes"} description="Review the five qualities in your own language. Move them into the order that feels most important or useful to you." headingRef={headingRef} /><LMUFinalSelectionGroup label="Your Final Five">{response.finalizedAttributeIds.map((id, index) => { const attribute = response.attributes.find((item) => item.id === id); if (!attribute) return null; return <LMUFinalSelectionRow key={id} rank={index + 1} total={5} title={attribute.positiveAttribute} badge={<LMUBadgeIcon name={iconName} state="active" size={54} label={moduleTitle} />} context={<><p><strong>Derived from:</strong> {attribute.sourcePainPointLabel}</p>{attribute.description && <p>{attribute.description}</p>}</>} actions={<LMUFinalMoveControls title={attribute.positiveAttribute} index={index} lastIndex={4} onMove={(direction) => moveAttribute(index, direction)} />} />; })}</LMUFinalSelectionGroup><button className="button button-primary" type="button" disabled={response.finalizedAttributeIds.length !== 5} onClick={finalize}><span>Confirm My {moduleTitle} Attributes</span><span aria-hidden="true">✓</span></button>{startOver}</main>}

    {screen === "final" && <main className="teammates-shell teammate-final"><LMUScreenHeading eyebrow={moduleTitle} title={`Your Top 5 ${moduleTitle} Attributes`} description={isSupervisor ? "These are the leadership qualities and behaviors you identified as helping you do your best work." : "These are the qualities you identified in the people and team culture that help you do your best work."} headingRef={headingRef} /><ol>{response.finalizedAttributeIds.map((id, index) => { const attribute = response.attributes.find((item) => item.id === id); return attribute ? <li key={id}><span>{String(index + 1).padStart(2, "0")}</span><LMUBadgeIcon name={iconName} state="active" size={58} label={moduleTitle} /><div><h2>{attribute.positiveAttribute}</h2>{attribute.description && <p>{attribute.description}</p>}</div></li> : null; })}</ol><button className="button button-primary" type="button" onClick={finish}><span>Finish Module</span><span aria-hidden="true">→</span></button>{startOver}</main>}
  </LMUShell>;
}
