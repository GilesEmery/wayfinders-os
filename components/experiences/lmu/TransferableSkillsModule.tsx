"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LMUInstructionalMedia } from "@/lib/experiences/lmu/types";
import { LMU_ORIGINAL_EXPERIENCE_ID } from "@/lib/experiences/lmu/original-journey";
import { LMU_DEV_UNLOCK_ALL } from "@/lib/experiences/lmu/development";
import { getFinalizedTopThreeStories } from "@/modules/lmu/success-stories/storage";
import type { SuccessStory } from "@/modules/lmu/success-stories/types";
import { transferableSkillCategories } from "@/modules/lmu/transferable-skills/curriculum";
import { buildGroupRankingGraph, createBoundaryAssignments, createCutoffAssignment, createInitialGroupAssignments, createStratificationAssignments, type ConfirmedSkillGroupRanking, type SkillGroupAssignment } from "@/modules/lmu/transferable-skills/group-ranking";
import { emptyTransferableSkillsResponse, generateCandidatePool, readTransferableSkillsResponse, saveTransferableSkillsResponse, finalizeTransferableSkills, completeTransferableSkills } from "@/modules/lmu/transferable-skills/storage";
import type { TransferableSkillCategory, TransferableSkillEvidence, TransferableSkillsResponse, TransferableSkillsScreen } from "@/modules/lmu/transferable-skills/types";
import { LMUBadgeIcon } from "./icons/badge/LMUBadgeIcon";
import { LMUInstructionalVideo } from "./LMUInstructionalVideo";
import { LMUInternalProgress } from "./LMUInternalProgress";
import { LMUScreenHeading } from "./LMUScreenHeading";
import { LMUPilotSectionHeader } from "./LMUPilotSectionHeader";
import { LMUShell } from "./LMUShell";
import { MapAccent } from "./MapAccent";
import { ModuleStartOverControl } from "./ModuleStartOverControl";
import { useOriginalProgress } from "./useOriginalProgress";
import { usePageStart } from "./usePageStart";
import { LMUFinalMoveControls, LMUFinalSelectionGroup, LMUFinalSelectionRow, LMUInlineReplacementChooser } from "./LMUFinalSelectionReview";

function evidenceCopy(evidence: TransferableSkillEvidence, stories: SuccessStory[]) {
  const titles = evidence.storyIds.flatMap((id) => {
    const story = stories.find((item) => item.id === id);
    return story ? [story.title] : [];
  });
  if (titles.length < 2) return titles.length ? `Appeared in ${titles[0]}` : "";
  return `Appeared in ${titles.slice(0, -1).join(", ")} and ${titles[titles.length - 1]}`;
}

const allTransferableSkills = transferableSkillCategories.flatMap((category) => category.skills);
const transferableScreens = new Set<TransferableSkillsScreen>(["introduction", ...transferableSkillCategories.map((category) => category.id), "patterns", "ranking", "review", "final"]);

function safeResumeScreen(response: TransferableSkillsResponse): TransferableSkillsScreen {
  const requested = response.resumeScreen;
  if (!transferableScreens.has(requested)) return "introduction";
  if (requested !== "ranking") return requested;
  const unfinishedGroup = response.ranking.groupAssignments.some((assignment) => !response.ranking.groupRankings.some((ranking) => ranking.groupId === assignment.groupId));
  if (unfinishedGroup) return "ranking";
  if (response.ranking.finalTopTen.length >= 5 || response.ranking.algorithmicTopTen.length >= 5) return "review";
  return "patterns";
}

export function TransferableSkillsModule({ media }: { media?: Record<string, LMUInstructionalMedia> }) {
  useOriginalProgress();
  const [hydrated, setHydrated] = useState(false);
  const stories = hydrated ? getFinalizedTopThreeStories() : [];
  const storyIds = stories.map((story) => story.id);
  const response = hydrated ? readTransferableSkillsResponse(storyIds) : emptyTransferableSkillsResponse();
  const [screen, setScreen] = useState<TransferableSkillsScreen>("introduction");
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [expandedSkillHelpIds, setExpandedSkillHelpIds] = useState<string[]>([]);
  const [replacementSkillId, setReplacementSkillId] = useState<string | null>(null);
  const [, refreshSavedResponse] = useState(0);
  const [reviewIds, setReviewIds] = useState<string[]>([]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  const hasPrerequisite = stories.length === 3;
  const evidenceById = useMemo(() => new Map(response.evidence.map((item) => [item.canonicalKey, item])), [response.evidence]);
  const currentGroup = response.ranking.groupAssignments.find((assignment) => !response.ranking.groupRankings.some((ranking) => ranking.groupId === assignment.groupId));
  const currentGroupOrder = currentGroup ? response.ranking.draftGroupRankings[currentGroup.groupId] ?? [] : [];
  const activeScreen = safeResumeScreen({ ...response, resumeScreen: screen });
  usePageStart(activeScreen, headingRef);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedStories = getFinalizedTopThreeStories();
      const savedResponse = readTransferableSkillsResponse(savedStories.map((story) => story.id));
      const resumeScreen = safeResumeScreen(savedResponse);
      if (resumeScreen !== savedResponse.resumeScreen) saveTransferableSkillsResponse({ ...savedResponse, resumeScreen });
      setScreen(resumeScreen);
      setReviewIds((savedResponse.ranking.finalTopTen.length ? savedResponse.ranking.finalTopTen : savedResponse.ranking.algorithmicTopTen).slice(0, 10));
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function go(next: TransferableSkillsScreen) {
    saveTransferableSkillsResponse({ ...response, resumeScreen: next });
    setExpandedIds([]);
    setScreen(next);
  }

  function begin() {
    if (!hasPrerequisite) return;
    go("realistic");
  }

  function updateCategory(category: TransferableSkillCategory, skillId: string, storyId: string) {
    const categorySelections = response.categorySelections[category.id] ?? {};
    const selected = categorySelections[skillId] ?? [];
    const nextSelected = selected.includes(storyId) ? selected.filter((id) => id !== storyId) : [...selected, storyId];
    saveTransferableSkillsResponse({ ...response, categorySelections: { ...response.categorySelections, [category.id]: { ...categorySelections, [skillId]: nextSelected } }, resumeScreen: category.id });
  }

  function continueCategory(category: TransferableSkillCategory) {
    const index = transferableSkillCategories.findIndex((item) => item.id === category.id);
    const visitedCategoryIds = [...new Set([...response.visitedCategoryIds, category.id])];
    if (index < transferableSkillCategories.length - 1) {
      const nextScreen = transferableSkillCategories[index + 1].id;
      saveTransferableSkillsResponse({ ...response, visitedCategoryIds, resumeScreen: nextScreen });
      setScreen(nextScreen);
    }
    else {
      const withVisited = { ...response, visitedCategoryIds };
      generateCandidatePool(withVisited);
      setScreen("patterns");
    }
  }

  function beginRanking() {
    const assignments = response.ranking.groupAssignments.length ? response.ranking.groupAssignments : createInitialGroupAssignments(response.candidateSkillIds);
    saveTransferableSkillsResponse({ ...response, ranking: { ...response.ranking, groupAssignments: assignments, currentPhase: "initial" }, resumeScreen: "ranking" });
    setScreen("ranking");
  }

  function rankGroupSkill(skillId: string) {
    if (!currentGroup) return;
    const index = currentGroupOrder.indexOf(skillId);
    const nextOrder = index >= 0 ? currentGroupOrder.slice(0, index) : [...currentGroupOrder, skillId];
    saveTransferableSkillsResponse({ ...response, ranking: { ...response.ranking, draftGroupRankings: { ...response.ranking.draftGroupRankings, [currentGroup.groupId]: nextOrder } }, resumeScreen: "ranking" });
    refreshSavedResponse((value) => value + 1);
  }

  function resetCurrentGroup() {
    if (!currentGroup) return;
    saveTransferableSkillsResponse({ ...response, ranking: { ...response.ranking, draftGroupRankings: { ...response.ranking.draftGroupRankings, [currentGroup.groupId]: [] } }, resumeScreen: "ranking" });
    refreshSavedResponse((value) => value + 1);
  }

  function confirmCurrentGroup() {
    if (!currentGroup || currentGroupOrder.length !== currentGroup.skillIds.length) return;
    const confirmed: ConfirmedSkillGroupRanking = { groupId: currentGroup.groupId, orderedSkillIds: currentGroupOrder, confirmedAt: new Date().toISOString() };
    const groupRankings = [...response.ranking.groupRankings, confirmed];
    const next = advanceGroupFunnel(response, groupRankings);
    saveTransferableSkillsResponse(next);
    setExpandedIds([]);
    if (next.resumeScreen === "review") { setReviewIds(next.ranking.algorithmicTopTen); setScreen("review"); }
    else refreshSavedResponse((value) => value + 1);
  }

  function moveSkill(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= reviewIds.length) return;
    const next = [...reviewIds];
    [next[index], next[target]] = [next[target], next[index]];
    setReviewIds(next);
    setReplacementSkillId(null);
    saveTransferableSkillsResponse({ ...response, ranking: { ...response.ranking, finalTopTen: next, finalTopFive: next.slice(0, 5) }, finalTopFiveSkillIds: [], finalizedAt: undefined, resumeScreen: "review" });
  }

  function beginTopFiveReplacement(skillId: string) {
    setReplacementSkillId(skillId);
  }

  function replaceTopFiveSkill(topFiveIndex: number) {
    if (!replacementSkillId || topFiveIndex < 0 || topFiveIndex >= 5) return;
    const next = [...reviewIds];
    const promotedIndex = next.indexOf(replacementSkillId);
    if (promotedIndex < 5) return;
    [next[topFiveIndex], next[promotedIndex]] = [next[promotedIndex], next[topFiveIndex]];
    setReviewIds(next);
    saveTransferableSkillsResponse({ ...response, ranking: { ...response.ranking, finalTopTen: next, finalTopFive: next.slice(0, 5) }, finalTopFiveSkillIds: [], finalizedAt: undefined, resumeScreen: "review" });
    setReplacementSkillId(null);
  }

  function confirmRanking() {
    if (reviewIds.length < 5) return;
    finalizeTransferableSkills(response, reviewIds);
    setScreen("final");
  }

  function finishSection() {
    const current = readTransferableSkillsResponse(storyIds);
    completeTransferableSkills(current);
    router.push("/experiences/life-mapping-u/original/modules");
  }

  function redoSkillsNarrowing() {
    saveTransferableSkillsResponse({ ...response, ranking: emptyTransferableSkillsResponse().ranking, finalTopFiveSkillIds: [], finalizedAt: undefined, resumeScreen: "patterns" });
    setReviewIds([]);
    setReplacementSkillId(null);
    setExpandedIds([]);
    setScreen("patterns");
  }

  const skillSteps: TransferableSkillsScreen[] = ["introduction", ...transferableSkillCategories.map((category) => category.id), "patterns", "ranking", "review", "final"];
  const handleBack = activeScreen === "introduction"
    ? undefined
    : activeScreen === "review"
      ? () => setScreen("patterns")
      : () => go(skillSteps[skillSteps.indexOf(activeScreen) - 1]);
  const hasSkillsNarrowingWork = response.ranking.groupAssignments.length > 0 || response.ranking.groupRankings.length > 0 || Object.values(response.ranking.draftGroupRankings).some((ids) => ids.length > 0) || response.finalTopFiveSkillIds.length > 0;
  const skillsRedo = hasSkillsNarrowingWork && ["ranking", "review", "final"].includes(activeScreen) ? { label: "Redo Skills Narrowing", title: "Redo Skills Narrowing?", description: "This will erase the choices you made while narrowing and ranking your skills. The skills you identified from your Success Stories will remain, and you will begin the narrowing process again.", onConfirm: redoSkillsNarrowing } : undefined;
  const startOver = <ModuleStartOverControl experienceId={LMU_ORIGINAL_EXPERIENCE_ID} moduleId="transferable-skills" moduleHref="/experiences/life-mapping-u/module/transferable-skills" screen={activeScreen} onBack={handleBack} redo={skillsRedo} />;

  return <LMUShell context="Transferable Skills" theme="dark" journeyHref="/experiences/life-mapping-u/original/modules" onInternalBack={activeScreen === "introduction" ? undefined : handleBack}>
    {activeScreen === "introduction" && <main className="success-intro transferable-skills-intro">
      <section className="success-intro-copy transferable-skills-intro-copy">
        <p className="eyebrow eyebrow-rule">Transferable Skills</p>
        <h1 ref={headingRef} tabIndex={-1}>Transferable Skills</h1>
        <p className="success-intro-accent">Discover the skills you bring with you.</p>
        <p>Transferable skills are abilities you can carry from one role, environment, or season of life into another.</p>
        <p>Use your three Success Stories to notice the skills you relied on when you were doing something you enjoyed and did well.</p>
        {media?.intro && <LMUInstructionalVideo {...media.intro} />}
        <div className="skills-reminders"><p className="eyebrow">Important reminders</p><ul><li>Use your Success Stories to identify the skills you relied on most.</li><li>Transferable skills are those that can be applied across different roles and environments.</li><li>This is a thoughtful process. Take your time and trust what emerges.</li></ul></div>
        <div className="skills-intro-instructions"><p>You will work through six categories: <strong>Realistic, Social, Conventional, Artistic, Enterprising, and Investigative.</strong></p><p>For your three success stories, identify skills you actually used</p><p>After working through all six categories, you will narrow the skills you identified to your Top 5 Transferable Skills.</p></div>
        {!hasPrerequisite && <div className="skills-dependency" role="status"><strong>Your three Success Stories are needed before this module can be completed.</strong><p>Return to Success Stories and finalize your Top 3. Development access remains available, but no substitute stories will be created.</p></div>}
        <StoryContext stories={stories} expandedIds={expandedIds} onToggle={(id) => setExpandedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} />
        <button className="button button-primary" type="button" disabled={!hasPrerequisite} onClick={begin}><span>Begin With Realistic</span><span aria-hidden="true">→</span></button>
        {startOver}
      </section>
      <aside className="success-memory-panel skills-category-prompt"><MapAccent density="tight" position="center" opacity={0.18} /><div><p className="eyebrow">Six ways skills show up</p><ol>{transferableSkillCategories.map((category) => <li key={category.id}><LMUBadgeIcon name={category.iconKey} state="dark" size={42} label={category.title} context="dark" /><span>{category.title}</span></li>)}</ol><p>Notice what you repeatedly bring across different experiences.</p></div></aside>
    </main>}

    {transferableSkillCategories.map((category, categoryIndex) => activeScreen === category.id && <main className="skills-category" key={category.id}>
      <header className="skills-category-hero">
        <LMUPilotSectionHeader className="skills-category-title" icon={category.iconKey} iconLabel={category.title} eyebrow={`${categoryIndex + 1} of 6 · ${category.title}`} title={category.subtitle} description={category.description} headingRef={headingRef} />
        <LMUInternalProgress label={`Transferable Skills category ${categoryIndex + 1} of 6`} items={transferableSkillCategories.map((item, index) => ({ id: item.id, label: item.title, icon: item.iconKey, status: index < categoryIndex ? "completed" as const : index === categoryIndex ? "current" as const : "future" as const }))} />
      </header>
      <section className="skills-workarea">
        <StoryContext stories={stories} expandedIds={expandedIds} onToggle={(id) => setExpandedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} />
        <CompactStoryHeader stories={stories} />
        <div className="skills-matrix">{category.skills.map((skill) => <div className={`skill-row${skill.briefDescription ? " has-explanation" : ""}`} role="group" aria-labelledby={`${skill.id}-label`} key={skill.id}><div className="skill-row-label"><span id={`${skill.id}-label`}>{skill.label}</span>{skill.briefDescription && skill.longDescription && <TransferableSkillHelp skillId={skill.id} briefDescription={skill.briefDescription} longDescription={skill.longDescription} expanded={expandedSkillHelpIds.includes(skill.id)} onToggle={() => setExpandedSkillHelpIds((current) => current.includes(skill.id) ? current.filter((id) => id !== skill.id) : [...current, skill.id])} />}</div><span className="skill-appeared">Appeared in:</span>{stories.map((story) => {
          const checked = (response.categorySelections[category.id]?.[skill.id] ?? []).includes(story.id);
          return <label className={`skill-story-choice${checked ? " is-selected" : ""}`} key={story.id}><input type="checkbox" checked={checked} onChange={() => updateCategory(category, skill.id, story.id)} /><span aria-hidden="true">{checked ? "✓" : ""}</span><b>{story.title}</b></label>;
        })}</div>)}</div>
        <nav className="skills-category-actions" aria-label="Category navigation"><button className="story-cancel" type="button" onClick={() => go(categoryIndex === 0 ? "introduction" : transferableSkillCategories[categoryIndex - 1].id)}>← Back</button><button className="button button-primary" type="button" onClick={() => continueCategory(category)}><span>{categoryIndex === 5 ? "Review My Patterns" : `Continue to ${transferableSkillCategories[categoryIndex + 1].title}`}</span><span aria-hidden="true">→</span></button></nav>
        {startOver}
      </section>
    </main>)}

    {activeScreen === "patterns" && <main className="skills-results-shell">
      <LMUScreenHeading eyebrow="Transferable Skills" title="Look at what keeps showing up." description="Your stories are beginning to reveal patterns. The examples from your Success Stories give you a place to begin; you will decide what matters most next." headingRef={headingRef} />
      <div className="skill-pattern-groups">{[3, 2, 1].map((count) => {
        const items = response.evidence.filter((item) => response.candidateSkillIds.includes(item.canonicalKey) && item.storyCount === count);
        if (!items.length) return null;
        return <section key={count}><p className="eyebrow">Showed up in {count === 3 ? "all 3" : count} {count === 1 ? "story" : "stories"}</p><ul>{items.map((item) => <li key={item.canonicalKey}><div>{item.categoryIds.map((id) => { const category = transferableSkillCategories.find((entry) => entry.id === id)!; return <LMUBadgeIcon key={id} name={category.iconKey} state="outlined" size={34} label={category.title} />; })}</div><strong>{item.label}</strong><span>{item.storyCount} {item.storyCount === 1 ? "story" : "stories"}</span></li>)}</ul></section>;
      })}</div>
      {response.candidateSkillIds.length >= 5 ? <button className="button button-primary" type="button" onClick={beginRanking}><span>Rank My Transferable Skills</span><span aria-hidden="true">→</span></button> : <div className="skills-dependency"><strong>Select skills demonstrated across your stories before ranking.</strong><p>Return to the categories and identify at least five skills to create a Top 5.</p></div>}
      <button className="story-cancel" type="button" onClick={() => go("investigative")}>← Back to Investigative</button>{startOver}
    </main>}

    {activeScreen === "ranking" && currentGroup && <main className="top-three-shell comparison-shell skills-ranking-shell">
      <LMUScreenHeading eyebrow={`Transferable Skills · ${phaseLabel(currentGroup.phase)}`} title="Rank This Group" description={`Rank every skill from 1 to ${currentGroup.skillIds.length}, with 1 being the skill that feels most characteristic of what you bring at your best.`} headingRef={headingRef} />
      <div className="skill-group-instructions"><strong>How to rank this group</strong><p>Click the skill card you want to rank #1. Then click your choice for #2, and continue until every card has a number. To change your choices, click a numbered card to remove that rank and the ranks after it. When you are finished, select Continue.</p></div>
      <p className="skill-group-progress">Group {response.ranking.groupAssignments.filter((item) => item.phase === currentGroup.phase).findIndex((item) => item.groupId === currentGroup.groupId) + 1} of {response.ranking.groupAssignments.filter((item) => item.phase === currentGroup.phase).length} · {currentGroupOrder.length} of {currentGroup.skillIds.length} ranked</p>
      <section className="skill-group-grid" aria-label="Rank this group of transferable skills">{currentGroup.skillIds.map((id) => { const evidence = evidenceById.get(id); if (!evidence) return null; return <SkillGroupRankingCard key={id} evidence={evidence} stories={stories} rank={currentGroupOrder.indexOf(id) + 1} groupSize={currentGroup.skillIds.length} expanded={expandedIds.includes(id)} onRank={() => rankGroupSkill(id)} onToggleEvidence={() => setExpandedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} />; })}</section>
      <div className="skill-group-actions"><button className="story-cancel" type="button" disabled={!currentGroupOrder.length} onClick={resetCurrentGroup}>Reset this group</button><button className="button button-primary" type="button" disabled={currentGroupOrder.length !== currentGroup.skillIds.length} onClick={confirmCurrentGroup}><span>Continue</span><span aria-hidden="true">→</span></button></div>
      {LMU_DEV_UNLOCK_ALL && <aside className="skills-ranking-diagnostic" aria-label="Development ranking diagnostics"><span>Phase: {currentGroup.phase}</span><span>Candidate pool: {response.candidateSkillIds.length}</span><span>Groups completed: {response.ranking.groupRankings.length}</span><span>Known relationships: {buildGroupRankingGraph(response.candidateSkillIds, response.ranking.groupRankings).derivedRelationships.length}</span><span>Eliminated from Top 10: {response.ranking.eliminatedFromTopTen.length}</span><span>Interactions: {response.ranking.participantInteractions}</span></aside>}{startOver}
    </main>}

    {activeScreen === "review" && <main className="skills-results-shell skills-review">
      <LMUScreenHeading eyebrow="Your Transferable Skills" title="Does this look like you?" description="Seeing these skills together may help you notice something that was harder to see one comparison at a time. Review the list and make any final adjustments before choosing your Top 5. When you are finished, select Confirm My Top 5." headingRef={headingRef} />
      <LMUFinalSelectionGroup label="Your Top 5">{reviewIds.slice(0, 5).map((id, index) => { const evidence = evidenceById.get(id); if (!evidence) return null; const category = transferableSkillCategories.find((item) => item.id === evidence.categoryIds[0]); const definition = allTransferableSkills.find((skill) => evidence.sourceSkillIds.includes(skill.id)); return <LMUFinalSelectionRow key={id} rank={index + 1} total={5} title={evidence.label} badge={<LMUBadgeIcon name={category?.iconKey ?? "story"} state="active" size={54} label={category?.title} />} context={<p>{evidenceCopy(evidence, stories)}</p>} disclosureLabel="Examples" disclosureShowLabel="See Your Examples" disclosureHideLabel="Hide Your Examples" expanded={expandedIds.includes(id)} onToggleDisclosure={() => setExpandedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} detail={<SkillEvidenceDetail longDescription={definition?.longDescription} evidence={evidence} stories={stories} />} actions={<LMUFinalMoveControls title={evidence.label} index={index} lastIndex={4} onMove={(direction) => moveSkill(index, direction)} />} />; })}</LMUFinalSelectionGroup>
      <LMUFinalSelectionGroup label="Other Strong Skills" secondary>{reviewIds.slice(5, 10).map((id, offset) => { const index = offset + 5; const evidence = evidenceById.get(id); if (!evidence) return null; const category = transferableSkillCategories.find((item) => item.id === evidence.categoryIds[0]); const definition = allTransferableSkills.find((skill) => evidence.sourceSkillIds.includes(skill.id)); const open = replacementSkillId === id; return <LMUFinalSelectionRow key={id} rank={index + 1} total={Math.min(reviewIds.length, 10)} title={evidence.label} badge={<LMUBadgeIcon name={category?.iconKey ?? "story"} state="light" size={54} label={category?.title} />} context={<p>{evidenceCopy(evidence, stories)}</p>} disclosureLabel="Examples" disclosureShowLabel="See Your Examples" disclosureHideLabel="Hide Your Examples" expanded={expandedIds.includes(id)} onToggleDisclosure={() => setExpandedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} detail={<SkillEvidenceDetail longDescription={definition?.longDescription} evidence={evidence} stories={stories} />} actions={<LMUFinalMoveControls title={evidence.label} index={offset} lastIndex={Math.min(reviewIds.length, 10) - 6} onMove={(direction) => moveSkill(index, direction)}><button type="button" aria-expanded={open} onClick={() => beginTopFiveReplacement(id)}>Move Into Top 5</button></LMUFinalMoveControls>} after={open ? <LMUInlineReplacementChooser heading={`Which Top 5 skill should ${evidence.label} replace?`} choices={reviewIds.slice(0, 5).map((topId, choiceIndex) => ({ id: topId, rank: choiceIndex + 1, title: evidenceById.get(topId)?.label ?? "Skill" }))} onChoose={replaceTopFiveSkill} onCancel={() => setReplacementSkillId(null)} /> : undefined} />; })}</LMUFinalSelectionGroup>
      <button className="button button-primary" type="button" disabled={reviewIds.length < 5} onClick={confirmRanking}><span>Confirm My Top 5</span><span aria-hidden="true">✓</span></button>{startOver}
    </main>}

    {activeScreen === "final" && <main className="skills-final">
      <LMUScreenHeading eyebrow="Transferable Skills" title="Your Top 5 Transferable Skills" description="These are the abilities your stories show you bringing across experiences—and the order you chose as most true for you." headingRef={headingRef} />
      <ol>{response.finalTopFiveSkillIds.map((id, index) => { const evidence = evidenceById.get(id); if (!evidence) return null; const category = transferableSkillCategories.find((item) => item.id === evidence.categoryIds[0])!; const definition = allTransferableSkills.find((skill) => evidence.sourceSkillIds.includes(skill.id)); return <li key={id}><span>{String(index + 1).padStart(2, "0")}</span><LMUBadgeIcon name={category.iconKey} state="active" size={58} label={category.title} /><div><h2>{evidence.label}</h2>{definition?.briefDescription && <p>{definition.briefDescription}</p>}<p>Seen in: {evidence.storyIds.map((storyId) => stories.find((story) => story.id === storyId)?.title).filter(Boolean).join(" · ")}</p></div></li>; })}</ol>
      <button className="button button-primary" type="button" disabled={response.finalTopFiveSkillIds.length !== 5} onClick={finishSection}><span>Finish Module</span><span aria-hidden="true">→</span></button>{startOver}
    </main>}
  </LMUShell>;
}

function StoryContext({ stories, expandedIds, onToggle }: { stories: SuccessStory[]; expandedIds: string[]; onToggle: (id: string) => void }) {
  if (stories.length !== 3) return null;
  return <section className="skills-story-context" aria-label="Your finalized Success Stories">{stories.map((story) => <article key={story.id}><p className="eyebrow">Your Success Story</p><h2>{story.title}</h2><button type="button" aria-expanded={expandedIds.includes(story.id)} onClick={() => onToggle(story.id)}>{expandedIds.includes(story.id) ? "− Hide Story" : "+ View Story"}</button>{expandedIds.includes(story.id) && <div><strong>What happened?</strong><p>{story.story}</p></div>}</article>)}</section>;
}

function CompactStoryHeader({ stories }: { stories: SuccessStory[] }) {
  const [openStoryId, setOpenStoryId] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRefs = useRef(new Map<string, HTMLButtonElement>());
  const openStory = stories.find((story) => story.id === openStoryId);

  useEffect(() => {
    if (!openStoryId) return;
    const activeStoryId = openStoryId;
    closeButtonRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Tab") {
        event.preventDefault();
        closeButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpenStoryId(null);
      window.requestAnimationFrame(() => triggerRefs.current.get(activeStoryId)?.focus());
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [openStoryId]);

  function closeDetails() {
    const storyId = openStoryId;
    setOpenStoryId(null);
    if (storyId) window.requestAnimationFrame(() => triggerRefs.current.get(storyId)?.focus());
  }

  if (stories.length !== 3) return null;
  const openStoryIndex = openStory ? stories.findIndex((story) => story.id === openStory.id) : -1;
  return <>
    <div className="skills-matrix-heading" aria-label="Success Story columns">
      <span className="skills-matrix-heading-label">Skill</span>
      {stories.map((story, index) => <div className="skills-compact-story" key={story.id}>
        <strong>{story.title}</strong>
        <button ref={(node) => { if (node) triggerRefs.current.set(story.id, node); else triggerRefs.current.delete(story.id); }} type="button" aria-label={`View details for ${story.title}`} aria-controls={`compact-story-dialog-${index}`} aria-expanded={openStoryId === story.id} onClick={() => setOpenStoryId(story.id)}>+</button>
      </div>)}
    </div>
    {openStory && <div className="skills-story-detail-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetails(); }}>
      <section className="skills-story-detail-dialog" id={`compact-story-dialog-${openStoryIndex}`} role="dialog" aria-modal="true" aria-labelledby={`compact-story-title-${openStoryIndex}`}>
        <button className="skills-story-detail-close" ref={closeButtonRef} type="button" aria-label={`Close details for ${openStory.title}`} onClick={closeDetails}>×</button>
        <p className="eyebrow">Your Success Story</p>
        <h2 id={`compact-story-title-${openStoryIndex}`}>{openStory.title}</h2>
        <div><strong>What happened?</strong><p>{openStory.story}</p></div>
      </section>
    </div>}
  </>;
}

function phaseLabel(phase: SkillGroupAssignment["phase"]) { return ({ initial: "First Pass", bottom: "Bottom Stratification", top: "Top Consolidation", middle: "Middle Challenge", boundary: "Top 10 Boundary", cutoff: "Final Cutoff" })[phase]; }

function advanceGroupFunnel(response: TransferableSkillsResponse, groupRankings: ConfirmedSkillGroupRanking[]): TransferableSkillsResponse {
  let assignments = response.ranking.groupAssignments;
  const allConfirmed = (phase: SkillGroupAssignment["phase"]) => assignments.filter((item) => item.phase === phase).every((item) => groupRankings.some((ranking) => ranking.groupId === item.groupId));
  let topCandidates = response.ranking.topCandidates, middleCandidates = response.ranking.middleCandidates, bottomCandidates = response.ranking.bottomCandidates;
  if (allConfirmed("initial") && !assignments.some((item) => item.phase === "bottom" || item.phase === "top" || item.phase === "middle")) {
    const stratification = createStratificationAssignments(assignments.filter((item) => item.phase === "initial"), groupRankings);
    assignments = [...assignments, ...stratification.assignments];
    ({ topCandidates, middleCandidates, bottomCandidates } = stratification);
  } else if (allConfirmed("bottom") && allConfirmed("top") && allConfirmed("middle") && !assignments.some((item) => item.phase === "boundary")) {
    assignments = [...assignments, ...createBoundaryAssignments(response.candidateSkillIds, groupRankings)];
  } else if (allConfirmed("boundary") && !assignments.some((item) => item.phase === "cutoff")) {
    assignments = [...assignments, ...createCutoffAssignment(response.candidateSkillIds, groupRankings)];
  }
  const remaining = assignments.some((assignment) => !groupRankings.some((ranking) => ranking.groupId === assignment.groupId));
  const graph = buildGroupRankingGraph(response.candidateSkillIds, groupRankings);
  const algorithmicTopTen = graph.sortedSkillIds.slice(0, 10);
  const currentPhase = remaining ? assignments.find((assignment) => !groupRankings.some((ranking) => ranking.groupId === assignment.groupId))!.phase : "complete";
  return { ...response, ranking: { ...response.ranking, groupAssignments: assignments, groupRankings, topCandidates, middleCandidates, bottomCandidates, participantInteractions: groupRankings.length, currentPhase, groupPhaseComplete: !remaining, derivedRelationships: graph.derivedRelationships, eliminatedFromTopFive: graph.eliminatedFromTopFive, eliminatedFromTopTen: graph.eliminatedFromTopTen, topFiveContenders: graph.sortedSkillIds.filter((id) => !graph.eliminatedFromTopFive.includes(id)), topTenContenders: graph.sortedSkillIds.filter((id) => !graph.eliminatedFromTopTen.includes(id)), provisionalTopTen: algorithmicTopTen, algorithmicTopFive: remaining ? response.ranking.algorithmicTopFive : algorithmicTopTen.slice(0, 5), algorithmicTopTen: remaining ? response.ranking.algorithmicTopTen : algorithmicTopTen }, resumeScreen: remaining ? "ranking" : "review" };
}

function SkillGroupRankingCard({ evidence, stories, rank, groupSize, expanded, onRank, onToggleEvidence }: { evidence: TransferableSkillEvidence; stories: SuccessStory[]; rank: number; groupSize: number; expanded: boolean; onRank: () => void; onToggleEvidence: () => void }) {
  const category = transferableSkillCategories.find((item) => item.id === evidence.categoryIds[0]);
  const definition = allTransferableSkills.find((skill) => evidence.sourceSkillIds.includes(skill.id));
  return <article className={`skill-group-card${rank ? " is-ranked" : ""}`} data-ranking-state={rank ? "ranked" : "available"}><MapAccent variant={2} position="center" opacity={0.09} /><button className="skill-group-rank-button" type="button" onClick={onRank} aria-label={`${evidence.label}, ${rank ? `ranked ${rank} of ${groupSize}; remove this rank and later ranks` : "unranked; rank next"}`}><span className="skill-group-rank-marker" aria-hidden="true">{rank || "—"}</span><LMUBadgeIcon name={category?.iconKey ?? "story"} state={rank ? "active" : "outlined"} size={44} /><span><strong>{evidence.label}</strong>{definition?.briefDescription && <small>{definition.briefDescription}</small>}</span></button><button className="skill-group-evidence-toggle" type="button" aria-expanded={expanded} onClick={onToggleEvidence}>{expanded ? "− Hide Your Examples" : "+ See Your Examples"}</button>{expanded && <SkillEvidenceDetail longDescription={definition?.longDescription} evidence={evidence} stories={stories} />}</article>;
}

function SkillEvidenceDetail({ longDescription, evidence, stories }: { longDescription?: string; evidence: TransferableSkillEvidence; stories: SuccessStory[] }) {
  const [expandedStoryIds, setExpandedStoryIds] = useState<string[]>([]);
  return <div className="skill-evidence-detail">
    <section><h4>What this skill means</h4><p>{longDescription ?? "This skill description will be available as the curriculum is refined."}</p></section>
    <section><h4>Where this showed up</h4><p className="skill-evidence-summary">{evidence.storyCount === 3 ? "Appeared in all 3 stories" : `Appeared in ${evidence.storyCount} of your 3 stories`}</p>
      <ul>{evidence.storyIds.map((storyId) => { const story = stories.find((item) => item.id === storyId); if (!story) return null; const expanded = expandedStoryIds.includes(storyId); return <li key={storyId}><strong>{story.title}</strong><button type="button" aria-expanded={expanded} aria-controls={`${evidence.canonicalKey}-${storyId}-story`} onClick={() => setExpandedStoryIds((current) => current.includes(storyId) ? current.filter((id) => id !== storyId) : [...current, storyId])}>{expanded ? "− Hide Story" : "+ View Story"}</button>{expanded && <div id={`${evidence.canonicalKey}-${storyId}-story`}><span>What happened?</span><p>{story.story}</p></div>}</li>; })}</ul>
    </section>
  </div>;
}

function TransferableSkillHelp({ skillId, briefDescription, longDescription, expanded, onToggle }: { skillId: string; briefDescription: string; longDescription: string; expanded: boolean; onToggle: () => void }) {
  const explanationId = `${skillId}-explanation`;
  return <span className="transferable-skill-help"><span className="transferable-skill-brief">{briefDescription}</span><button type="button" aria-expanded={expanded} aria-controls={explanationId} aria-label={expanded ? "Hide explanation" : "Show explanation"} onClick={onToggle}>{expanded ? "−" : "+"}</button>{expanded && <span className="transferable-skill-long" id={explanationId}>{longDescription}</span>}</span>;
}
