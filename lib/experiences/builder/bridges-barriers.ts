export const BRIDGES_RENDERER_KEY = 'bridges-vs-barriers.v1';
export const BRIDGES_RESPONSE_KEY = 'bridges_vs_barriers_assessment';
export const BRIDGES_SLUG = 'bridges-vs-barriers';
export const BRIDGES_TITLE = 'Bridges vs. Barriers';
export const BRIDGES_SUBTITLE = 'Three Conversations About the Church';
export const BRIDGES_STAGES = ['Introduction', 'Conversation 1', 'Conversation 2', 'Conversation 3', 'Reflect Across the Conversations', 'Choose a Next Step', 'Review and Complete'] as const;
export const BRIDGES_TONES = ['Open', 'Hurt', 'Confused', 'Hopeful', 'Frustrated', 'Curious', 'Other', 'Unsure'] as const;
export const BRIDGES_INFLUENCES = ['Personal experience', 'Biblical or theological understanding', 'Family or tradition', 'Media', 'Painful experiences', 'Other', 'Unsure'] as const;
export const BRIDGES_CLASSIFICATIONS = ['Bridge', 'Barrier', 'Still discerning'] as const;
export const BRIDGES_EXPLANATION = 'These totals summarize the observations you recorded. They do not measure a person’s faith, a church’s health, or the success of your conversation. Someone sharing hurt may also be showing trust by speaking honestly with you.';
export const BRIDGES_REFLECTIONS = [
    ['surprised', 'What stood out or surprised you in your three conversations?'],
    ['connection', 'Where did you sense connection or resistance?'],
    ['bridgeBarrier', 'How might these views of the church reveal a barrier or a bridge?'],
    ['response', 'How did you respond when someone shared something difficult or different from your own experience?'],
    ['posture', 'What might Jesus be inviting you to notice about your own assumptions or posture?'],
] as const;
export const BRIDGES_CONVERSATION_QUESTIONS = [['definition', 'How did this person define the church?'], ['surprised', 'What stood out or surprised you?'], ['connection', 'Where did you sense connection or resistance?']] as const;
export type BridgeClassification = typeof BRIDGES_CLASSIFICATIONS[number] | '';
export type BridgeObservation = {
    id: string;
    text: string;
    classification: BridgeClassification;
    reason: string;
};
export type BridgeConversation = {
    label: string;
    definition: string;
    tones: string[];
    toneOther: string;
    influences: string[];
    influenceOther: string;
    surprised: string;
    connection: string;
    observations: BridgeObservation[];
};
export type BridgesData = {
    conversations: BridgeConversation[];
    reflections: Record<typeof BRIDGES_REFLECTIONS[number][0], string>;
    nextStep: {
        relationship: string;
        action: string;
        timing: string;
    };
};
export type BridgesFinished = {
    schemaVersion: 1;
    sourceVersion: typeof BRIDGES_RENDERER_KEY;
    completedAt: string;
    participantMaterial: BridgesData;
};
export type BridgesEnvelope = {
    schemaVersion: 1;
    draft: BridgesData;
    finished: BridgesFinished | null;
    previousResults: BridgesFinished[];
};
export type BridgesIssue = {
    stage: number;
    field: string;
    message: string;
};
const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const text = (v: unknown) => typeof v === 'string' ? v : '';
export function bridgeSelections(input: unknown, options: readonly string[]) { const values = Array.isArray(input) ? options.filter(v => input.includes(v)) : []; return values.includes('Unsure') ? ['Unsure'] : values; }
export function toggleBridgeSelection(current: readonly string[], value: string) { return current.includes(value) ? current.filter(v => v !== value) : value === 'Unsure' ? ['Unsure'] : [...current.filter(v => v !== 'Unsure'), value]; }
export function emptyBridgesData(): BridgesData { return { conversations: [1, 2, 3].map(i => ({ label: '', definition: '', tones: [], toneOther: '', influences: [], influenceOther: '', surprised: '', connection: '', observations: [{ id: `c${i}-observation-1`, text: '', classification: '', reason: '' }] })), reflections: { surprised: '', connection: '', bridgeBarrier: '', response: '', posture: '' }, nextStep: { relationship: '', action: '', timing: '' } }; }
export function normalizeBridgesData(input: unknown): BridgesData {
    const root = object(input), source = object(root.draft ?? root), empty = emptyBridgesData(), conversations = Array.isArray(source.conversations) ? source.conversations : [];
    return { conversations: empty.conversations.map((base, i) => { const c = object(conversations[i]); return { ...base, ...Object.fromEntries(['label', 'definition', 'toneOther', 'influenceOther', 'surprised', 'connection'].map(k => [k, text(c[k])])), tones: bridgeSelections(c.tones, BRIDGES_TONES), influences: bridgeSelections(c.influences, BRIDGES_INFLUENCES), observations: Array.isArray(c.observations) ? c.observations.map((value, j) => { const o = object(value); return { id: text(o.id) || `c${i + 1}-observation-${j + 1}`, text: text(o.text), classification: BRIDGES_CLASSIFICATIONS.includes(o.classification as never) ? o.classification as BridgeClassification : '', reason: text(o.reason) }; }) : base.observations }; }), reflections: Object.fromEntries(BRIDGES_REFLECTIONS.map(([key]) => [key, text(object(source.reflections)[key])])) as BridgesData['reflections'], nextStep: { relationship: text(object(source.nextStep).relationship), action: text(object(source.nextStep).action), timing: text(object(source.nextStep).timing) } };
}
export const meaningfulObservation = (o: BridgeObservation) => Boolean(o.text.trim() || o.classification || o.reason.trim());
export const completeObservation = (o: BridgeObservation) => Boolean(o.text.trim() && o.classification);
export function bridgeCounts(observations: readonly BridgeObservation[]) { const complete = observations.filter(completeObservation), bridges = complete.filter(o => o.classification === 'Bridge').length, barriers = complete.filter(o => o.classification === 'Barrier').length, discerning = complete.filter(o => o.classification === 'Still discerning').length; return { bridges, barriers, discerning, total: bridges - barriers }; }
export const combinedBridgeCounts = (data: BridgesData) => bridgeCounts(data.conversations.flatMap(c => c.observations));
export const bridgeTotalLabel = (total: number) => total > 0 ? `+${total}` : String(total);
export function bridgesIssues(data: BridgesData): BridgesIssue[] {
    const issues: BridgesIssue[] = [];
    data.conversations.forEach((c, i) => {
        for (const [key, label] of BRIDGES_CONVERSATION_QUESTIONS)
            if (!c[key].trim())
                issues.push({ stage: i + 1, field: key, message: `Conversation ${i + 1}: ${label}` });
        const cards = c.observations.filter(meaningfulObservation);
        if (!cards.some(completeObservation))
            issues.push({ stage: i + 1, field: 'observations', message: `Conversation ${i + 1}: add at least one observation with its classification.` });
        c.observations.forEach((o, j) => { if (meaningfulObservation(o) && !completeObservation(o))
            issues.push({ stage: i + 1, field: `observation-${o.id}`, message: `Conversation ${i + 1}, observation ${j + 1}: complete the observation and classification, or remove the card.` }); });
    });
    for (const [key, label] of BRIDGES_REFLECTIONS)
        if (!data.reflections[key].trim())
            issues.push({ stage: 4, field: key, message: label });
    for (const [key, label] of [['relationship', 'Choose a person or relationship.'], ['action', 'Describe one specific action.'], ['timing', 'Say when you intend to take that step.']] as const)
        if (!data.nextStep[key].trim())
            issues.push({ stage: 5, field: key, message: label });
    return issues;
}
export function validateBridgesDraft(data: BridgesData) {
    if (JSON.stringify(data).length > 800000)
        throw Error('This reflection is too large to save. Shorten the longest responses and try again.');
    const check = (value: string) => { if (value.length > 12000)
        throw Error('Each written response must be 12,000 characters or fewer. Your text remains here so you can shorten it.'); };
    for (const c of data.conversations) {
        for (const key of ['label', 'definition', 'toneOther', 'influenceOther', 'surprised', 'connection'] as const)
            check(c[key]);
        const ids = new Set<string>();
        for (const o of c.observations) {
            if (!/^[a-zA-Z0-9-]{1,100}$/.test(o.id) || ids.has(o.id))
                throw Error('Observation identifiers must be unique within each conversation.');
            ids.add(o.id);
            check(o.text);
            check(o.reason);
        }
    }
    Object.values(data.reflections).forEach(check);
    Object.values(data.nextStep).forEach(check);
}
export const bridgesComplete = (data: BridgesData) => bridgesIssues(data).length === 0;
function readFinished(value: unknown): BridgesFinished | null { const f = object(value), material = normalizeBridgesData(f.participantMaterial); return f.schemaVersion === 1 && f.sourceVersion === BRIDGES_RENDERER_KEY && typeof f.completedAt === 'string' && Number.isFinite(Date.parse(f.completedAt)) && bridgesComplete(material) ? { schemaVersion: 1, sourceVersion: BRIDGES_RENDERER_KEY, completedAt: f.completedAt, participantMaterial: material } : null; }
export function normalizeBridgesEnvelope(input: unknown): BridgesEnvelope { const root = object(input); return { schemaVersion: 1, draft: normalizeBridgesData(root.draft ?? root), finished: readFinished(root.finished), previousResults: Array.isArray(root.previousResults) ? root.previousResults.map(readFinished).filter((f): f is BridgesFinished => Boolean(f)) : [] }; }
export function projectBridgesSave(priorInput: unknown, input: unknown, now: string, finish = false, retakeCompletedAt?: string): BridgesEnvelope {
    const prior = normalizeBridgesEnvelope(priorInput), draft = normalizeBridgesData(input);
    validateBridgesDraft(draft);
    if (finish && bridgesIssues(draft).length)
        throw Error('Complete the required reflections and observation cards before completing this assessment.');
    const retaking = finish && Boolean(prior.finished && retakeCompletedAt === prior.finished.completedAt);
    const finished: BridgesFinished | null = (!prior.finished || retaking) && finish ? { schemaVersion: 1 as const, sourceVersion: BRIDGES_RENDERER_KEY, completedAt: now, participantMaterial: structuredClone({ ...draft, conversations: draft.conversations.map(c => ({ ...c, observations: c.observations.filter(meaningfulObservation) })) }) } : prior.finished;
    return { schemaVersion: 1, draft, finished, previousResults: retaking && prior.finished ? [...prior.previousResults, prior.finished] : prior.previousResults };
}
export function bridgesResponseItems(data: BridgesData) { return [...data.conversations.flatMap((c, i) => [{ question: `Conversation ${i + 1} · Who did you speak with?`, response: c.label }, ...BRIDGES_CONVERSATION_QUESTIONS.map(([key, label]) => ({ question: `Conversation ${i + 1} · ${label}`, response: c[key] })), { question: `Conversation ${i + 1} · Tone`, response: [...c.tones, ...(c.tones.includes('Other') && c.toneOther ? [c.toneOther] : [])].join(' · ') }, { question: `Conversation ${i + 1} · What shaped their understanding?`, response: [...c.influences, ...(c.influences.includes('Other') && c.influenceOther ? [c.influenceOther] : [])].join(' · ') }, ...c.observations.filter(meaningfulObservation).flatMap((o, j) => [{ question: `Conversation ${i + 1} · Observation ${j + 1}`, response: o.text }, { question: `Conversation ${i + 1} · Observation ${j + 1} classification`, response: o.classification }, { question: `Conversation ${i + 1} · Observation ${j + 1} explanation`, response: o.reason }])]), ...BRIDGES_REFLECTIONS.map(([key, question]) => ({ question, response: data.reflections[key] })), ...Object.entries(data.nextStep).map(([key, response]) => ({ question: `Your next step · ${key}`, response }))]; }
