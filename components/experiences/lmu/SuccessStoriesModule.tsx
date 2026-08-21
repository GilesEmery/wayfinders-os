"use client";

import { useOriginalProgress } from "./useOriginalProgress";
import { LMUShell } from "./LMUShell";
import { MapAccent } from "./MapAccent";
import {
  SUCCESS_STORIES_MAXIMUM,
  SUCCESS_STORIES_MINIMUM,
  successStoryAgeRanges,
} from "@/modules/lmu/success-stories/config";
import {
  completeSuccessStories,
  deleteSuccessStory,
  finalizeTopThree,
  removeLastSuccessStoryComparison,
  reconcileSuccessStoriesCompletion,
  restartTopThreeSelection,
  saveSuccessStory,
  saveSuccessStoryComparison,
  saveSuccessStoryDraft,
  saveSuccessStoriesLocation,
  saveTopThreeProposal,
} from "@/modules/lmu/success-stories/storage";
import type { SuccessStoriesResponse, SuccessStoriesScreen, SuccessStory, SuccessStoryDraft } from "@/modules/lmu/success-stories/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LMUInstructionalMedia } from "@/lib/experiences/lmu/types";
import { LMUInstructionalVideo } from "./LMUInstructionalVideo";
import { ModuleStartOverControl } from "./ModuleStartOverControl";
import { LMU_ORIGINAL_EXPERIENCE_ID } from "@/lib/experiences/lmu/original-journey";
import { usePageStart } from "./usePageStart";
import { focusAndReveal } from "./usePageStart";
import { LMUScreenHeading } from "./LMUScreenHeading";
import { LMUPilotSectionHeader } from "./LMUPilotSectionHeader";
import { getAdaptiveTopKStep } from "@/lib/experiences/lmu/ranking/pairwise";
import { successStoryToRankingVisual } from "@/lib/experiences/lmu/visuals/success-story-ranking-visual";
import { AdaptiveRankingComparison } from "./ranking/AdaptiveRankingComparison";
import { LMU_DEV_UNLOCK_ALL } from "@/lib/experiences/lmu/development";
import { LMUBadgeIcon } from "./icons/badge/LMUBadgeIcon";
import { LMUFinalMoveControls, LMUFinalSelectionGroup, LMUFinalSelectionRow, LMUInlineReplacementChooser } from "./LMUFinalSelectionReview";
import { removeModuleProgress } from "@/lib/experiences/lmu/storage";

type Screen = SuccessStoriesScreen;

const emptyDraft = (): SuccessStoryDraft => ({
  id: crypto.randomUUID(), title: "", ageRange: "", story: "", reflection: "",
});

function excerpt(value: string) {
  return value.length > 190 ? `${value.slice(0, 187).trim()}…` : value;
}

export function SuccessStoriesModule({ media }: { media?: Record<string, LMUInstructionalMedia> }) {
  const progress = useOriginalProgress();
  const moduleProgress = progress.find((item) => item.moduleId === "success-stories");
  const hasTransferableSkillsWork = progress.some((item) => item.moduleId === "transferable-skills" && Boolean(item.startedAt));
  const response = (moduleProgress?.responses ?? { stories: [] }) as unknown as SuccessStoriesResponse;
  const stories = useMemo(() => response.stories ?? [], [response.stories]);
  const validStoryCount = stories.filter((story) => story.title.trim() && story.story.trim()).length;
  const [screen, setScreen] = useState<Screen>(() => {
    if (response.draft) return "editor";
    const resumeScreen = response.resumeScreen;
    if (resumeScreen === "comparison" || resumeScreen === "top-three-intro") return validStoryCount >= SUCCESS_STORIES_MINIMUM ? resumeScreen : "collection";
    if (resumeScreen === "top-three-review") return response.topThreeSelection?.proposedStoryIds.length === 3 || response.topThreeSelection?.finalStoryIds.length === 3 ? resumeScreen : "collection";
    if (resumeScreen === "collection") return stories.length ? resumeScreen : "introduction";
    if (resumeScreen === "introduction") return stories.length ? "collection" : resumeScreen;
    return stories.length ? "collection" : "introduction";
  });
  const [draft, setDraft] = useState<SuccessStoryDraft | null>(response.draft ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [collectionTargetId, setCollectionTargetId] = useState<string | null>(null);
  const [expandedStoryIds, setExpandedStoryIds] = useState<string[]>([]);
  const [reviewIds, setReviewIds] = useState<string[]>(response.topThreeSelection?.finalStoryIds.length === 3 ? response.topThreeSelection.finalStoryIds : response.topThreeSelection?.proposedStoryIds ?? []);
  const [pendingSelectionId, setPendingSelectionId] = useState<string | null>(null);
  const [replacementStoryId, setReplacementStoryId] = useState<string | null>(null);
  const router = useRouter();
  const screenHeadingRef = useRef<HTMLHeadingElement>(null);
  const savedStoryRef = useRef<HTMLLIElement>(null);
  const comparisonWorkspaceRef = useRef<HTMLElement>(null);
  const comparisons = useMemo(() => response.topThreeSelection?.comparisons ?? [], [response.topThreeSelection?.comparisons]);
  const validStoryIds = useMemo(() => stories.filter((story) => story.title.trim() && story.story.trim()).map((story) => story.id), [stories]);
  const rankingStep = useMemo(() => getAdaptiveTopKStep(validStoryIds, comparisons.map((comparison) => ({
    leftId: comparison.leftStoryId,
    rightId: comparison.rightStoryId,
    selectedId: comparison.selectedStoryId,
  })), 3), [comparisons, validStoryIds]);
  usePageStart(screen === "collection" && collectionTargetId ? "" : screen === "comparison" ? "" : screen, screenHeadingRef);

  useEffect(() => {
    if (screen !== "comparison") return;
    const frame = window.requestAnimationFrame(() => {
      comparisonWorkspaceRef.current?.scrollIntoView({
        behavior: "auto",
        block: window.matchMedia("(max-width: 700px)").matches ? "start" : "center",
        inline: "nearest",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [screen]);

  useEffect(() => {
    reconcileSuccessStoriesCompletion();
  }, []);

  useEffect(() => {
    saveSuccessStoriesLocation(screen);
  }, [screen]);

  useEffect(() => {
    if (screen !== "collection" || !collectionTargetId) return;
    const frame = window.requestAnimationFrame(() => {
      if (savedStoryRef.current) focusAndReveal(savedStoryRef.current, "center");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [collectionTargetId, screen]);

  useEffect(() => {
    if (!draft || screen !== "editor") return;
    const timeout = window.setTimeout(() => saveSuccessStoryDraft(draft), 450);
    return () => window.clearTimeout(timeout);
  }, [draft, screen]);

  function startNewStory() {
    if (stories.length >= SUCCESS_STORIES_MAXIMUM) return;
    setDraft(emptyDraft());
    setErrors({});
    setCollectionTargetId(null);
    setScreen("editor");
  }

  function editStory(story: SuccessStory) {
    setDraft({ ...story });
    setErrors({});
    setCollectionTargetId(null);
    setScreen("editor");
  }

  function updateDraft(field: keyof SuccessStoryDraft, value: string) {
    setDraft((current) => current ? { ...current, [field]: value } : current);
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  function saveDraft() {
    if (!draft) return;
    const nextErrors: Record<string, string> = {};
    if (!draft.title.trim()) nextErrors.title = "Give this story a short name.";
    if (!draft.story.trim()) nextErrors.story = "Tell us what happened in this experience.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    const now = new Date().toISOString();
    const savedStory = {
      ...draft,
      title: draft.title.trim(), story: draft.story.trim(), reflection: draft.reflection.trim(), ageRange: draft.ageRange?.trim() || undefined,
      createdAt: draft.createdAt ?? now, updatedAt: now,
    };
    saveSuccessStory(savedStory);
    setCollectionTargetId(stories.length === 0 ? null : savedStory.id);
    setDraft(null);
    setScreen("collection");
  }

  function cancelEditing() {
    saveSuccessStoryDraft(undefined);
    setDraft(null);
    setScreen(stories.length ? "collection" : "introduction");
  }

  function finishSection() {
    if (validStoryCount < SUCCESS_STORIES_MINIMUM || response.topThreeSelection?.finalStoryIds.length !== 3 || !response.topThreeSelection.finalizedAt) return;
    completeSuccessStories();
    router.push("/experiences/life-mapping-u/original");
  }

  function openTopThree() {
    if (validStoryCount < SUCCESS_STORIES_MINIMUM) return;
    if (response.topThreeSelection?.finalizedAt) {
      setReviewIds(response.topThreeSelection.finalStoryIds);
      setScreen("top-three-review");
    } else {
      setScreen("top-three-intro");
    }
  }

  async function chooseStory(selectedStoryId: string) {
    if (!rankingStep.pair || pendingSelectionId) return;
    setPendingSelectionId(selectedStoryId);
    setExpandedStoryIds([]);
    await new Promise((resolve) => window.setTimeout(resolve, 480));
    const comparison = {
      leftStoryId: rankingStep.pair[0],
      rightStoryId: rankingStep.pair[1],
      selectedStoryId,
      createdAt: new Date().toISOString(),
    };
    saveSuccessStoryComparison(comparison);
    const nextStep = getAdaptiveTopKStep(validStoryIds, [...comparisons, comparison].map((item) => ({ leftId: item.leftStoryId, rightId: item.rightStoryId, selectedId: item.selectedStoryId })), 3);
    if (nextStep.complete) {
      saveTopThreeProposal(nextStep.proposedIds, false);
      setReviewIds(nextStep.proposedIds);
      setScreen("top-three-review");
    }
    setPendingSelectionId(null);
  }

  function beginComparing() {
    if (rankingStep.complete) {
      saveTopThreeProposal(rankingStep.proposedIds, false);
      setReviewIds(rankingStep.proposedIds);
      setScreen("top-three-review");
      return;
    }
    setScreen("comparison");
  }

  function updateReview(nextIds: string[]) {
    setReviewIds(nextIds);
    setReplacementStoryId(null);
    saveTopThreeProposal(nextIds);
  }

  function moveStoryToTopThree(storyId: string) {
    if (reviewIds.length < 3) {
      updateReview([...reviewIds, storyId]);
      return;
    }
    setReplacementStoryId(storyId);
  }

  function replaceTopThreeStory(index: number) {
    if (!replacementStoryId) return;
    const nextIds = [...reviewIds];
    nextIds[index] = replacementStoryId;
    updateReview(nextIds);
    setReplacementStoryId(null);
  }

  function restartTopThree() {
    restartTopThreeSelection();
    if (hasTransferableSkillsWork) {
      removeModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID, "transferable-skills");
      removeModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID, "current-motivator-rankings");
    }
    setReviewIds([]);
    setExpandedStoryIds([]);
    setScreen("top-three-intro");
  }

  const storySteps: Screen[] = ["introduction", "collection", "editor", "top-three-intro", "comparison", "top-three-review"];
  function sectionBack() {
    if (screen === "introduction") return;
    if (screen === "editor") { if (draft) saveSuccessStoryDraft(draft); setScreen(stories.length ? "collection" : "introduction"); return; }
    if (screen === "collection") { setScreen("introduction"); return; }
    if (screen === "top-three-review") { setScreen("top-three-intro"); return; }
    setScreen(storySteps[storySteps.indexOf(screen) - 1]);
  }

  const hasTopThreeWork = comparisons.length > 0 || Boolean(response.topThreeSelection?.proposedStoryIds.length) || Boolean(response.topThreeSelection?.finalStoryIds.length);
  const topThreeRedo = hasTopThreeWork && ["top-three-intro", "comparison", "top-three-review"].includes(screen) ? { label: "Redo Top 3", title: "Redo Top 3?", description: hasTransferableSkillsWork ? "This will erase the choices you made while narrowing your Success Stories to your Top 3. Because your Transferable Skills were built from those Top 3 stories, your Transferable Skills and Motivator Ranking will also be cleared and will need to be completed again. Your original Success Stories will remain, and you will begin the Top 3 process again." : "This will erase the choices you made while narrowing your Success Stories to your Top 3. Your Success Stories will remain, and you will begin the Top 3 process again.", onConfirm: restartTopThree } : undefined;
  const preserveSuccessStoriesLocation = () => {
    if (draft) saveSuccessStoryDraft(draft);
    saveSuccessStoriesLocation(screen);
  };
  const startOverControl = <ModuleStartOverControl experienceId={LMU_ORIGINAL_EXPERIENCE_ID} moduleHref="/experiences/life-mapping-u/module/success-stories" moduleId="success-stories" screen={screen} onBack={screen === "introduction" ? undefined : sectionBack} onBackToSections={preserveSuccessStoriesLocation} redo={topThreeRedo} />;

  return (
    <LMUShell context="Success Stories" theme="dark" journeyHref="/experiences/life-mapping-u/original" onJourneyReturn={preserveSuccessStoriesLocation} onInternalBack={screen === "introduction" ? undefined : sectionBack}>
      {screen === "introduction" && (
        <main className="success-intro">
          <section className="success-intro-copy">
            <p className="eyebrow eyebrow-rule">Guided module 01</p>
            <h1 ref={screenHeadingRef} tabIndex={-1}>Success Stories</h1>
            <p className="success-intro-accent">Your story is already giving you clues.</p>
            <p>Think back through your life in approximately five-year segments. Look for experiences where you <strong>liked what you were doing</strong> and <strong>were good at it</strong>.</p>
            {media?.intro && <LMUInstructionalVideo {...media.intro} />}
            <p><strong>Capture at least 5 Success Stories from across your life.</strong> You can add up to 15, so keep going beyond five if more stories come to mind.</p>
            <div className="success-equation"><span>What did I like?</span><b>+</b><span>What was I good at?</span></div>
            <p>You did not have to be the best. Notice experiences you liked doing and where you were able to use your abilities—at school, work, home, church, in sports, hobbies, friendships, projects, travel, or your community.</p>
            <button className="button button-primary" type="button" onClick={startNewStory}><span>Start My Success Stories</span><span aria-hidden="true">→</span></button>
            {startOverControl}
          </section>
          <aside className="success-memory-panel">
            <MapAccent density="tight" position="center" opacity={0.18} />
            <div>
              <p className="eyebrow">Think back through different seasons of life</p>
              <p className="success-memory-label">Some age ranges to get you thinking</p>
              <ol>{["Ages 5–10", "Ages 10–15", "Ages 20–25", "Ages 30–35", "Ages 40–45", "Ages 55–60", "Ages 65–70", "Ages 75+"].map((range) => <li key={range}>{range}</li>)}</ol>
              <p className="success-memory-helper">You do not need a story from every age range. These are simply prompts to help memories come to mind.</p>
            </div>
          </aside>
        </main>
      )}

      {screen === "editor" && draft && (
        <main className="story-editor-shell">
          <LMUPilotSectionHeader className="story-editor-header" icon="story" iconLabel="Success Story" eyebrow="Success Story" title={stories.some((story) => story.id === draft.id) ? "Edit Your Story" : "Add Your Story"} description="Write naturally. You can return and refine this story later." headingRef={screenHeadingRef} />
          <form className="story-form" onSubmit={(event) => { event.preventDefault(); saveDraft(); }}>
            <aside className="story-examples">
              <h2>Examples of Success Stories</h2>
              <p>These can come from any season of life: school, work, sports, hobbies, volunteering, church, relationships, creative projects, leadership, or something you built, solved, organized, or helped make happen.</p>
              <ul>
                <li>Performed as the lead in a school musical</li>
                <li>Trained for and completed my first 5K</li>
                <li>Organized a community or church event</li>
                <li>Started a small business or side project</li>
                <li>Helped someone solve a difficult problem</li>
                <li>Built, created, repaired, or designed something I was proud of</li>
              </ul>
            </aside>
            <StoryField label="Age / Life Stage" prompt="Optional"><select value={draft.ageRange} onChange={(event) => updateDraft("ageRange", event.target.value)}><option value="">Choose an age range</option>{successStoryAgeRanges.map((range) => <option key={range} value={range}>{range === "Not sure / Prefer not to specify" ? range : `Ages ${range}`}</option>)}</select></StoryField>
            <StoryField label="Title" prompt="Give this story a short name that reminds you what it's about." error={errors.title}><input value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} placeholder="Organized our neighborhood fundraiser" /></StoryField>
            <StoryField label="What happened?" prompt="Tell the story. For example, what role did you play? What did you accomplish or contribute? Think about your actions, decisions, things you created, problems you solved, people you helped, or responsibilities you carried." error={errors.story}><textarea rows={8} value={draft.story} onChange={(event) => updateDraft("story", event.target.value)} /></StoryField>
            <StoryField label="What did you like? What were you good at?" optional prompt="What did you like about this experience? What did you do well? Where did you notice abilities, skills, or strengths in yourself?"><textarea rows={7} value={draft.reflection} onChange={(event) => updateDraft("reflection", event.target.value)} /></StoryField>
            <div className="story-form-actions"><button className="story-cancel" type="button" onClick={cancelEditing}>Cancel</button><button className="button button-primary" type="submit"><span>Save Story</span><span aria-hidden="true">→</span></button></div>
            {startOverControl}
          </form>
        </main>
      )}

      {screen === "collection" && (
        <main className="story-collection">
          <LMUScreenHeading className="story-collection-heading" eyebrow="Success Stories" title="Look Across What You Have Captured" description="Different seasons of your life can begin to reveal patterns. Keep going if more stories are coming to mind." headingRef={screenHeadingRef} />
          <ol className="story-list">
            {stories.map((story, index) => (
              <li data-story-id={story.id} key={story.id} ref={story.id === collectionTargetId ? savedStoryRef : undefined} tabIndex={story.id === collectionTargetId ? -1 : undefined}>
                <span className="story-number">{String(index + 1).padStart(2, "0")}</span>
                <div><p className="story-age">{story.ageRange || "Life stage not specified"}</p><h2>{story.title}</h2><p>{excerpt(story.story)}</p></div>
                <div className="story-actions"><button type="button" onClick={() => editStory(story)}>Edit</button>{deleteId === story.id ? <div className="story-delete-confirm"><p>Remove this Success Story?</p><span>This will remove it from your current Life Mapping U work.</span><button type="button" onClick={() => { deleteSuccessStory(story.id); setDeleteId(null); }}>Remove</button><button type="button" onClick={() => setDeleteId(null)}>Keep story</button></div> : <button type="button" onClick={() => setDeleteId(story.id)}>Remove</button>}</div>
              </li>
            ))}
          </ol>
          <div className="story-collection-actions">
            {stories.length < SUCCESS_STORIES_MAXIMUM ? <button className="button button-secondary" type="button" onClick={startNewStory}><span>Add another Success Story</span><span aria-hidden="true">+</span></button> : <p>You have captured 15 Success Stories.</p>}
            {validStoryCount >= SUCCESS_STORIES_MINIMUM && <button className="button button-primary" type="button" onClick={openTopThree}><span>{response.topThreeSelection?.finalizedAt ? "Review My Top 3" : "Identify My Top 3"}</span><span aria-hidden="true">→</span></button>}
          </div>
          {startOverControl}
        </main>
      )}

      {screen === "top-three-intro" && (
        <main className="top-three-shell top-three-intro">
          <LMUScreenHeading eyebrow="Success Stories" title="Identify Your Top 3" description="We are identifying the stories that matter to you the most, for whatever reason. Look across what you captured and notice which stories best represent something you liked doing and were good at." headingRef={screenHeadingRef} />
          <div className="top-three-intro-copy">
            <p>The goal is not simply to identify your biggest accomplishments. We are looking for the stories that give the clearest clues about what you liked doing and what you were good at.</p>
            {media?.topThree && <LMUInstructionalVideo {...media.topThree} />}
            <button className="button button-primary" type="button" onClick={beginComparing}><span>Begin Comparing Stories</span><span aria-hidden="true">→</span></button>
            <button className="story-cancel" type="button" onClick={() => setScreen("collection")}>Back to my stories</button>
          </div>
          {startOverControl}
        </main>
      )}

      {screen === "comparison" && rankingStep.pair && (
        <main className="top-three-shell comparison-shell">
          <LMUScreenHeading eyebrow="Success Stories" title="Identify Your Top 3" description={rankingStep.clarification ? "One more look will help clarify which stories belong in your Top 3." : "Narrowing your stories"} headingRef={screenHeadingRef} />
          <section className="comparison-workspace" id="ranking-comparison" ref={comparisonWorkspaceRef}>
            <AdaptiveRankingComparison
              eyebrow="What you liked + what you were good at"
              prompt="Which of these stories better represents something you both liked doing and were good at?"
              items={rankingStep.pair.map((storyId) => successStoryToRankingVisual(stories.find((item) => item.id === storyId)!)) as [ReturnType<typeof successStoryToRankingVisual>, ReturnType<typeof successStoryToRankingVisual>]}
              expandedIds={expandedStoryIds}
              onToggle={(storyId) => setExpandedStoryIds((current) => current.includes(storyId) ? current.filter((id) => id !== storyId) : [...current, storyId])}
              onSelect={chooseStory}
              selectedId={pendingSelectionId}
            />
          </section>
          <div className="comparison-footer">
            <button className="story-cancel" type="button" disabled={!comparisons.length} onClick={removeLastSuccessStoryComparison}>Undo last comparison</button>
            <p>{comparisons.length ? `${comparisons.length} choices considered` : "Take your time with each pair"}</p>
          </div>
          {LMU_DEV_UNLOCK_ALL ? <button className="development-top-three-reset" type="button" onClick={restartTopThree}>Development only — Restart Top 3 Selection</button> : null}
          {startOverControl}
        </main>
      )}

      {screen === "top-three-review" && (
        <main className="top-three-shell top-three-review">
          <LMUScreenHeading eyebrow="Success Stories" title="Your Top 3" description="Does this look right? Seeing your stories together may help you recognize something that was harder to see one comparison at a time. Make any final adjustments before continuing." headingRef={screenHeadingRef} />
          <LMUFinalSelectionGroup label="Your Top 3">
            {reviewIds.map((storyId, index) => {
              const story = stories.find((item) => item.id === storyId);
              if (!story) return null;
              return <LMUFinalSelectionRow key={story.id} rank={index + 1} total={3} title={story.title} badge={<LMUBadgeIcon name="story" state="active" size={54} label="Success Story" />} context={<p>{story.ageRange ? `Ages ${story.ageRange}` : "Life stage not specified"}</p>} disclosureLabel="Story" expanded={expandedStoryIds.includes(story.id)} onToggleDisclosure={() => setExpandedStoryIds((current) => current.includes(story.id) ? current.filter((id) => id !== story.id) : [...current, story.id])} detail={<><p className="eyebrow">What happened?</p><p>{story.story}</p></>} actions={<LMUFinalMoveControls title={story.title} index={index} lastIndex={reviewIds.length - 1} onMove={(direction) => { const next = [...reviewIds]; const target = index + direction; [next[target], next[index]] = [next[index], next[target]]; updateReview(next); }} />} />;
            })}
          </LMUFinalSelectionGroup>
          <LMUFinalSelectionGroup label="Other stories you captured" secondary>{stories.filter((story) => !reviewIds.includes(story.id)).map((story, index) => <LMUFinalSelectionRow key={story.id} rank={index + 4} total={stories.length} title={story.title} badge={<LMUBadgeIcon name="story" state="light" size={54} label="Success Story" />} context={<p>{story.ageRange ? `Ages ${story.ageRange}` : "Life stage not specified"}</p>} disclosureLabel="Story" expanded={expandedStoryIds.includes(story.id)} onToggleDisclosure={() => setExpandedStoryIds((current) => current.includes(story.id) ? current.filter((id) => id !== story.id) : [...current, story.id])} detail={<><p className="eyebrow">What happened?</p><p>{story.story}</p></>} actions={<button type="button" aria-expanded={replacementStoryId === story.id} onClick={() => moveStoryToTopThree(story.id)}>Move to Top 3</button>} after={replacementStoryId === story.id ? <LMUInlineReplacementChooser heading="Which story should it replace?" choices={reviewIds.map((id, choiceIndex) => ({ id, rank: choiceIndex + 1, title: stories.find((item) => item.id === id)?.title ?? "Story" }))} onChoose={replaceTopThreeStory} onCancel={() => setReplacementStoryId(null)} /> : undefined} />)}</LMUFinalSelectionGroup>
          <div className="top-three-review-actions">
            {response.topThreeSelection?.finalizedAt && response.topThreeSelection.finalStoryIds.join("|") === reviewIds.join("|") ? <><p>Your Top 3 is finalized.</p><button className="button button-primary" type="button" onClick={finishSection}><span>Finish Module</span><span aria-hidden="true">→</span></button></> : <><p>{reviewIds.length === 3 ? "Confirm these three stories in this order." : `Choose exactly 3 stories to continue (${reviewIds.length} selected).`}</p><button className="button button-primary" type="button" disabled={reviewIds.length !== 3} onClick={() => finalizeTopThree(reviewIds)}><span>Finalize My Top 3</span><span aria-hidden="true">✓</span></button></>}
          </div>
          {LMU_DEV_UNLOCK_ALL ? <button className="development-top-three-reset" type="button" onClick={restartTopThree}>Development only — Restart Top 3 Selection</button> : null}
          {startOverControl}
        </main>
      )}
    </LMUShell>
  );
}

function StoryField({ label, prompt, error, optional = false, children }: { label: string; prompt: string; error?: string; optional?: boolean; children: React.ReactNode }) {
  return <label className="story-field"><span className="story-field-label">{optional && <small>Optional</small>}{label}</span><span className="story-field-prompt">{prompt}</span>{children}{error && <span className="story-field-error" role="alert">{error}</span>}</label>;
}
