"use client";
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Printer, Plus, Trash2 } from 'lucide-react';
import { NativeAssessmentShell } from './NativeAssessmentShell';
import { AssessmentFocusFrame } from './AssessmentFocusFrame';
import { AssessmentLaunchCard, assessmentLaunchLabel } from './AssessmentLaunchCard';
import { BridgesBarriersResults, BridgesConversationReview, BridgesCounts } from './BridgesBarriersResults';
import { saveBridgesBarriersAction, finishBridgesBarriersAction } from '@/lib/experiences/builder/bridges-barriers-actions';
import { returnFromAssessment } from '@/lib/experiences/builder/assessment-return';
import { BRIDGES_TITLE, BRIDGES_SUBTITLE, BRIDGES_STAGES, BRIDGES_TONES, BRIDGES_INFLUENCES, BRIDGES_CLASSIFICATIONS, BRIDGES_EXPLANATION, BRIDGES_REFLECTIONS, normalizeBridgesEnvelope, emptyBridgesData, bridgesIssues, bridgeCounts, toggleBridgeSelection, projectBridgesSave, meaningfulObservation, type BridgesData, type BridgeConversation, type BridgesIssue } from '@/lib/experiences/builder/bridges-barriers';
type Route = {
    slug: string;
    moduleKey: string;
    lessonKey: string;
    sectionKey: string;
    blockKey: string;
    cohortId?: string | null;
};
function Field({ id, label, value, onChange, helper, short = false, required = false }: {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    helper?: string;
    short?: boolean;
    required?: boolean;
}) { return <div className="bridges-field"><label htmlFor={id}>{label}{!required && <small> (optional)</small>}</label>{helper && <p id={`${id}-help`}>{helper}</p>}{short ? <input type="text" id={id} value={value} maxLength={12000} aria-required={required} aria-describedby={helper ? `${id}-help` : undefined} onChange={e => onChange(e.target.value)}/> : <textarea id={id} rows={4} value={value} maxLength={12000} aria-required={required} aria-describedby={helper ? `${id}-help` : undefined} onChange={e => onChange(e.target.value)}/>}</div>; }
function Multiple({ id, label, options, values, other, onChange, onOther, helper }: {
    id: string;
    label: string;
    options: readonly string[];
    values: string[];
    other: string;
    onChange: (v: string[]) => void;
    onOther: (v: string) => void;
    helper?: string;
}) { return <fieldset className="bridges-multiple"><legend>{label} <small>(optional)</small></legend><p id={`${id}-help`}>Select all that apply. Unsure is exclusive.{helper && <> {helper}</>}</p><div className="bridges-multiple-options">{options.map(value => <label key={value}><input type="checkbox" checked={values.includes(value)} aria-describedby={`${id}-help`} onChange={() => onChange(toggleBridgeSelection(values, value))}/>{value}</label>)}</div>{values.includes('Other') && <Field id={`${id}-other`} short label="Please specify" value={other} onChange={onOther}/>}</fieldset>; }
function canonical(data: BridgesData) { return JSON.stringify({ ...data, conversations: data.conversations.map(c => ({ ...c, observations: c.observations.filter(meaningfulObservation) })) }); }
export function BridgesBarriersAssessment({ initialData, route, preview = false, autoStart = false, returnTo = null, participantName }: {
    initialData: unknown;
    route: Route;
    preview?: boolean;
    autoStart?: boolean;
    returnTo?: string | null;
    participantName?: string;
}) {
    const initial = normalizeBridgesEnvelope(initialData), [data, setData] = useState(initial.draft), [finished, setFinished] = useState(initial.finished), [history, setHistory] = useState(initial.previousResults), [historicalIndex, setHistoricalIndex] = useState<number | null>(null);
    const [stage, setStage] = useState(0), [view, setView] = useState<'editing' | 'results'>(initial.finished ? 'results' : 'editing'), [focused, setFocused] = useState(autoStart), [state, setState] = useState<'idle' | 'unsaved' | 'saving' | 'saved' | 'error'>('idle'), [message, setMessage] = useState(''), [issues, setIssues] = useState<BridgesIssue[]>([]), [finishing, setFinishing] = useState(false);
    const queue = useRef(Promise.resolve()), timer = useRef<ReturnType<typeof setTimeout> | null>(null), busy = useRef(false), lastSaved = useRef(JSON.stringify(initial.draft)), latest = useRef(data), title = useRef<HTMLHeadingElement>(null), focusNext = useRef(false), retake = useRef<string | undefined>(undefined);
    useEffect(() => { latest.current = data; }, [data]);
    function edit(next: BridgesData) { if (busy.current)
        return; setData(next); setState('unsaved'); setMessage(''); setIssues([]); }
    function conversation(index: number, patch: Partial<BridgeConversation>) { edit({ ...data, conversations: data.conversations.map((c, i) => i === index ? { ...c, ...patch } : c) }); }
    function go(next: number, field?: string) { setStage(next); setView('editing'); focusNext.current = true; if (field)
        window.setTimeout(() => { document.getElementById(`bridges-${next}-${field}`)?.focus(); }, 50); }
    useEffect(() => { if (focusNext.current) {
        title.current?.focus();
        focusNext.current = false;
    } }, [stage, view]);
    async function save(captured: BridgesData) {
        if (preview) {
            setMessage('Preview only · responses are not saved.');
            return;
        }
        const task = queue.current.then(async () => { setState('saving'); try {
            await saveBridgesBarriersAction(route.slug, route.moduleKey, route.lessonKey, route.sectionKey, route.blockKey, route.cohortId, captured);
            lastSaved.current = JSON.stringify(captured);
            if (JSON.stringify(latest.current) === lastSaved.current) {
                setState('saved');
                setMessage('Draft saved. You can return to continue.');
            }
            else
                setState('unsaved');
        }
        catch (error) {
            setState('error');
            setMessage(error instanceof Error ? error.message : 'Unable to save. Your answers remain here; please retry.');
            throw error;
        } });
        queue.current = task.catch(() => { });
        return task;
    }
    const saveRef = useRef(save);
    useEffect(() => { saveRef.current = save; });
    useEffect(() => { if (preview || view !== 'editing' || busy.current || JSON.stringify(data) === lastSaved.current)
        return; timer.current = setTimeout(() => { void saveRef.current(data).catch(() => { }); }, 900); return () => { if (timer.current)
        clearTimeout(timer.current); }; }, [data, preview, view]);
    useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (!preview && (JSON.stringify(latest.current) !== lastSaved.current || busy.current)) {
        event.preventDefault();
        event.returnValue = '';
    } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [preview]);
    async function saveDraft() { if (timer.current)
        clearTimeout(timer.current); try {
        await save(data);
    }
    catch { /* Preserve editor and actionable failure. */ } }
    async function close() { if (busy.current)
        return; if (timer.current)
        clearTimeout(timer.current); try {
        if (!preview && view === 'editing')
            await save(data);
        if (autoStart)
            returnFromAssessment(returnTo ?? '/dashboard');
        else
            setFocused(false);
    }
    catch { /* Stay in the assessment after a failed save. */ } }
    async function complete() {
        if (busy.current)
            return;
        const missing = bridgesIssues(data);
        setIssues(missing);
        if (missing.length) {
            setMessage('Please complete the sections listed below. Your responses are retained.');
            setState('error');
            return;
        }
        busy.current = true;
        setFinishing(true);
        setState('saving');
        if (timer.current)
            clearTimeout(timer.current);
        const captured = data;
        try {
            await queue.current;
            const envelope = preview ? projectBridgesSave({ draft: data, finished, previousResults: history }, captured, new Date().toISOString(), true, retake.current) : (await finishBridgesBarriersAction(route.slug, route.moduleKey, route.lessonKey, route.sectionKey, route.blockKey, route.cohortId, captured, retake.current)).envelope;
            if (!envelope.finished)
                throw Error('Completion could not be confirmed. Please retry.');
            lastSaved.current = JSON.stringify(captured);
            setFinished(envelope.finished);
            setHistory(envelope.previousResults);
            setHistoricalIndex(null);
            setView('results');
            setState('saved');
            setMessage(preview ? 'Preview only · completion is not saved.' : 'Assessment completed and saved.');
            retake.current = undefined;
            focusNext.current = true;
        }
        catch (error) {
            setState('error');
            setMessage(error instanceof Error ? error.message : 'Unable to complete your assessment. Your answers remain here; please retry.');
        }
        finally {
            busy.current = false;
            setFinishing(false);
        }
    }
    function beginRetake() { if (!finished)
        return; retake.current = finished.completedAt; edit(emptyBridgesData()); setStage(0); setView('editing'); setHistoricalIndex(null); setMessage('Your completed reflection is preserved. This is a new draft.'); focusNext.current = true; }
    const status = finished ? 'completed' : canonical(data) !== canonical(emptyBridgesData()) ? 'in_progress' : 'not_started', pendingRetake = finished && canonical(data) !== canonical(finished.participantMaterial);
    if (!focused && !autoStart)
        return <AssessmentLaunchCard eyebrow={BRIDGES_SUBTITLE} title={BRIDGES_TITLE} description="Listen deeply in three conversations, reflect on bridges and barriers, and choose one relational next step." status={status} action={<button type="button" onClick={() => setFocused(true)}>{preview ? 'Preview Assessment' : assessmentLaunchLabel(status)}</button>}/>;
    const selectedResult = historicalIndex === null ? finished : history[historicalIndex];
    const results = view === 'results' && selectedResult;
    let content: ReactNode;
    if (results)
        content = <><BridgesBarriersResults data={results.participantMaterial} participantName={participantName} completedAt={results.completedAt}/><div className="bridges-actions bridges-no-print"><button type="button" onClick={() => window.print()}><Printer size={16} aria-hidden="true"/> Print / Save as PDF</button><button type="button" onClick={beginRetake}>Start a new reflection</button>{pendingRetake && <button type="button" onClick={() => { retake.current = finished!.completedAt; go(bridgesIssues(data)[0]?.stage ?? 6); }}>Continue new draft</button>}<button type="button" onClick={() => void close()}>{returnTo ? 'Return to course' : 'Save and close'}</button></div>{history.length > 0 && <label className="bridges-history bridges-no-print">Saved reflections<select value={historicalIndex === null ? 'current' : String(historicalIndex)} onChange={e => setHistoricalIndex(e.target.value === 'current' ? null : Number(e.target.value))}><option value="current">Most recent completed reflection</option>{history.map((item, i) => <option key={item.completedAt} value={i}>{new Date(item.completedAt).toLocaleString()}</option>)}</select></label>}</>;
    else if (stage === 0)
        content = <section className="bridges-introduction"><h2>Three Conversations About the Church</h2><p>How people understand the church is often shaped by their experiences, relationships, hopes, and disappointments. Listening to those stories can help us recognize where connection has grown and where distance remains.</p><p>This assessment invites you to have three intentional conversations, reflect on what you hear, and consider how you might build a bridge through those relationships.</p><p>Have three intentional conversations with people in your circle of influence, such as friends, coworkers, neighbors, or people you are already walking alongside.</p><p>Listen deeply and give each person room to speak honestly. Resist the urge to correct, defend, or turn their answer into a debate. Seek to understand their experience.</p><h3>Ask each person</h3><blockquote>“What is the church? How would you define it?”</blockquote><h3>Optional follow-up questions</h3><ul><li>What do you think the church should be?</li><li>Where have you experienced issues, frustrations, or disconnection with the church?</li></ul><h3>As you listen, notice</h3><ul><li>Their tone, such as openness, hurt, confusion, or hope.</li><li>What seems to have shaped their understanding.</li><li>Values or themes they mention, such as belonging, hypocrisy, tradition, justice, or care.</li><li>Where you sense connection or resistance.</li></ul><p>You can complete this assessment over several days. Save your progress and return after each conversation.</p><p>You may use initials or a label such as “neighbor” instead of a person’s name. Include only the personal details needed for your reflection.</p></section>;
    else if (stage >= 1 && stage <= 3) {
        const index = stage - 1, c = data.conversations[index];
        content = <><Field id={`bridges-${stage}-label`} short label="Who did you speak with?" helper="Use a first name, initials, or a label such as “coworker.”" value={c.label} onChange={label => conversation(index, { label })}/><Field id={`bridges-${stage}-definition`} required label="How did this person define the church?" value={c.definition} onChange={definition => conversation(index, { definition })}/><Multiple id={`bridges-${stage}-tones`} label="What tone did you notice?" options={BRIDGES_TONES} values={c.tones} other={c.toneOther} onChange={tones => conversation(index, { tones })} onOther={toneOther => conversation(index, { toneOther })}/><Multiple id={`bridges-${stage}-influences`} label="What seemed to shape their understanding?" helper="Record your impressions with humility. You may not know everything that shaped their response." options={BRIDGES_INFLUENCES} values={c.influences} other={c.influenceOther} onChange={influences => conversation(index, { influences })} onOther={influenceOther => conversation(index, { influenceOther })}/><Field id={`bridges-${stage}-surprised`} required label="What stood out or surprised you?" value={c.surprised} onChange={surprised => conversation(index, { surprised })}/><Field id={`bridges-${stage}-connection`} required label="Where did you sense connection or resistance?" helper="If neither was clear, describe what you noticed." value={c.connection} onChange={connection => conversation(index, { connection })}/><section className="bridges-observations"><h3>Identify the Bridges and Barriers</h3><p>Record specific things you heard or noticed. A bridge reveals something that has helped create connection, trust, belonging, or openness. A barrier reveals something that has created distance, hurt, distrust, or disconnection.</p><p>Some observations may need more reflection. Choose “Still discerning” when you are unsure.</p>{c.observations.map((o, j) => <article className="bridges-observation" id={`bridges-${stage}-observation-${o.id}`} tabIndex={-1} key={o.id}><header><h4>Observation {j + 1}</h4><button type="button" aria-label={`Remove observation ${j + 1}`} onClick={() => { conversation(index, { observations: c.observations.filter(item => item.id !== o.id) }); window.setTimeout(() => document.getElementById(`bridges-${stage}-add-observation`)?.focus(), 0); }}><Trash2 size={16} aria-hidden="true"/> Remove</button></header><Field id={`${o.id}-text`} label="What was said or observed?" required value={o.text} onChange={text => conversation(index, { observations: c.observations.map(item => item.id === o.id ? { ...item, text } : item) })}/><fieldset className="bridges-classification"><legend>What does this reveal?</legend>{BRIDGES_CLASSIFICATIONS.map(classification => <label key={classification}><input type="radio" name={`classification-${index}-${o.id}`} checked={o.classification === classification} onChange={() => conversation(index, { observations: c.observations.map(item => item.id === o.id ? { ...item, classification } : item) })}/>{classification}</label>)}</fieldset><Field id={`${o.id}-reason`} label="Why did you identify it this way?" value={o.reason} onChange={reason => conversation(index, { observations: c.observations.map(item => item.id === o.id ? { ...item, reason } : item) })}/></article>)}<button id={`bridges-${stage}-add-observation`} type="button" onClick={() => { const id = crypto.randomUUID(); conversation(index, { observations: [...c.observations, { id, text: '', classification: '', reason: '' }] }); window.setTimeout(() => document.getElementById(`${id}-text`)?.focus(), 0); }}><Plus size={16} aria-hidden="true"/> Add another observation</button><BridgesCounts counts={bridgeCounts(c.observations)}/><p className="bridges-score-explanation">{BRIDGES_EXPLANATION}</p></section></>;
    }
    else if (stage === 4)
        content = <><div className="bridges-summary">{data.conversations.map((c, i) => <details key={i}><summary>Conversation {i + 1}{c.label ? ` · ${c.label}` : ''} · {bridgesIssues(data).some(issue => issue.stage === i + 1) ? 'Needs attention' : 'Ready'}</summary><BridgesConversationReview conversation={c} index={i}/></details>)}</div>{BRIDGES_REFLECTIONS.map(([key, label]) => <Field key={key} id={`bridges-4-${key}`} required label={label} value={data.reflections[key]} onChange={value => edit({ ...data, reflections: { ...data.reflections, [key]: value } })}/>)}</>;
    else if (stage === 5)
        content = <><h3>Build a Bridge</h3><p>Considering what you heard, what is one step you could take to build a bridge?</p><p>Your next step might be asking another question, acknowledging someone’s hurt, sharing a meal, offering practical help, or continuing a conversation about Jesus when welcomed.</p><Field id="bridges-5-relationship" required short label="Which person or relationship do you want to keep investing in?" helper="A relationship label is sufficient." value={data.nextStep.relationship} onChange={relationship => edit({ ...data, nextStep: { ...data.nextStep, relationship } })}/><Field id="bridges-5-action" required label="What is one specific action you will take?" value={data.nextStep.action} onChange={action => edit({ ...data, nextStep: { ...data.nextStep, action } })}/><Field id="bridges-5-timing" required short label="When do you intend to take that step?" helper="For example, “this week” or “the next time we meet.”" value={data.nextStep.timing} onChange={timing => edit({ ...data, nextStep: { ...data.nextStep, timing } })}/></>;
    else
        content = <><p>Review your listening reflections and next step. You can save an incomplete draft or complete the whole assessment below.</p>{data.conversations.map((c, i) => <section key={i} className="bridges-review-section"><header><h3>Conversation {i + 1} · {bridgesIssues(data).some(issue => issue.stage === i + 1) ? 'Needs attention' : 'Ready'}</h3><button type="button" onClick={() => go(i + 1)}>Edit conversation {i + 1}</button></header><BridgesConversationReview conversation={c} index={i}/></section>)}<section className="bridges-review-section"><header><h3>Reflect Across the Conversations</h3><button type="button" onClick={() => go(4)}>Edit reflections</button></header><dl>{BRIDGES_REFLECTIONS.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{data.reflections[key] || 'Not answered'}</dd></div>)}</dl></section><section className="bridges-review-section"><header><h3>Your Next Step</h3><button type="button" onClick={() => go(5)}>Edit next step</button></header><dl>{Object.entries(data.nextStep).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value || 'Not answered'}</dd></div>)}</dl></section></>;
    return <AssessmentFocusFrame active={focused && !autoStart} label={BRIDGES_TITLE} onClose={() => void close()}><NativeAssessmentShell returnTo={returnTo} showReturn={autoStart}><section className="ethos-assessment bridges-assessment" aria-label={BRIDGES_TITLE}><header className="ethos-intro"><div className="ethos-intro-meta"><p>{BRIDGES_TITLE}</p><span>{BRIDGES_SUBTITLE}</span></div><h1 ref={title} tabIndex={-1}>{view === 'results' ? 'Your Bridges vs. Barriers Reflection' : BRIDGES_STAGES[stage]}</h1><p>Listening, discernment, personal formation, and relational action.</p></header>{view === 'editing' && <><nav className="bridges-stage-nav bridges-no-print" aria-label="Assessment sections">{BRIDGES_STAGES.map((label, i) => <button key={label} type="button" aria-current={stage === i ? 'step' : undefined} disabled={finishing} onClick={() => go(i)}>{i + 1}. {label}</button>)}</nav><div className="ethos-progress" role="progressbar" aria-label="Required sections ready" aria-valuenow={5 - new Set(bridgesIssues(data).map(issue => issue.stage)).size} aria-valuemin={0} aria-valuemax={5}><span>{5 - new Set(bridgesIssues(data).map(issue => issue.stage)).size} of 5 sections ready</span></div></>}<div className="bridges-content"><fieldset disabled={finishing} className="bridges-editor-fields">{content}</fieldset>{issues.length > 0 && <section className="bridges-validation" role="alert" aria-label="Sections to complete"><h2>Sections to complete</h2><ul>{issues.map((issue, i) => <li key={`${issue.stage}-${issue.field}-${i}`}><button type="button" onClick={() => go(issue.stage, issue.field)}>{issue.message}</button></li>)}</ul></section>}<p className="bridges-save-status bridges-no-print" role={state === 'error' ? 'alert' : 'status'} aria-live="polite">{state === 'saving' ? 'Saving…' : message || (state === 'unsaved' ? 'Unsaved changes' : preview ? 'Preview only · responses are not saved.' : 'Save your progress and return after each conversation.')}</p>{view === 'editing' && <footer className="bridges-actions bridges-no-print"><button type="button" disabled={stage === 0 || finishing} onClick={() => go(stage - 1)}>Back</button><button type="button" disabled={finishing} onClick={() => void saveDraft()}>Save draft</button><button type="button" disabled={finishing} onClick={() => void close()}>Save and close</button>{stage === 6 ? <button className="is-primary" type="button" disabled={finishing} onClick={() => void complete()}>{finishing ? 'Completing…' : 'Complete assessment'}</button> : <button className="is-primary" type="button" disabled={finishing} onClick={() => go(stage + 1)}>{stage === 0 ? (status === 'not_started' ? 'Begin' : 'Continue') : 'Continue'}</button>}</footer>}{view === 'editing' && finished && <button className="bridges-no-print" type="button" onClick={() => setView('results')}>View saved reflection</button>}</div></section></NativeAssessmentShell></AssessmentFocusFrame>;
}
