"use client";
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Printer } from 'lucide-react';
import { NativeAssessmentShell } from './NativeAssessmentShell';
import { AssessmentFocusFrame } from './AssessmentFocusFrame';
import { AssessmentLaunchCard, assessmentLaunchLabel } from './AssessmentLaunchCard';
import { MicrochurchResults } from './MicrochurchResults';
import { saveMicrochurchAction, finishMicrochurchAction } from '@/lib/experiences/builder/microchurch-actions';
import { returnFromAssessment } from '@/lib/experiences/builder/assessment-return';
import { MICROCHURCH_TITLE, MICROCHURCH_SUBTITLE, MICROCHURCH_STAGES, MICROCHURCH_INTRO, MICROCHURCH_QUESTIONS, normalizeMicrochurchEnvelope, emptyMicrochurchData, microchurchIssues, projectMicrochurchSave, type MicrochurchData, type MicrochurchIssue } from '@/lib/experiences/builder/microchurch';
const canonical = (data: MicrochurchData) => JSON.stringify(data);
type Route = {
    slug: string;
    moduleKey: string;
    lessonKey: string;
    sectionKey: string;
    blockKey: string;
    cohortId?: string | null;
};
export function MicrochurchAssessment({ initialData, route, preview = false, autoStart = false, returnTo = null, participantName }: {
    initialData: unknown;
    route: Route;
    preview?: boolean;
    autoStart?: boolean;
    returnTo?: string | null;
    participantName?: string;
}) {
    const initial = normalizeMicrochurchEnvelope(initialData), [data, setData] = useState(initial.draft), [finished, setFinished] = useState(initial.finished), [history, setHistory] = useState(initial.previousResults), [historicalIndex, setHistoricalIndex] = useState<number | null>(null);
    const [stage, setStage] = useState(0), [view, setView] = useState<'editing' | 'results'>(initial.finished ? 'results' : 'editing'), [focused, setFocused] = useState(autoStart), [state, setState] = useState<'idle' | 'unsaved' | 'saving' | 'saved' | 'error'>('idle'), [message, setMessage] = useState(''), [issues, setIssues] = useState<MicrochurchIssue[]>([]), [finishing, setFinishing] = useState(false);
    const queue = useRef(Promise.resolve()), timer = useRef<ReturnType<typeof setTimeout> | null>(null), busy = useRef(false), lastSaved = useRef(JSON.stringify(initial.draft)), latest = useRef(data), title = useRef<HTMLHeadingElement>(null), focusNext = useRef(false), retake = useRef<string | undefined>(undefined);
    useEffect(() => { latest.current = data; }, [data]);
    function edit(next: MicrochurchData) { if (busy.current)
        return; setData(next); setState('unsaved'); setMessage(''); setIssues([]); }
    function go(next: number, field?: string) { setStage(next); setView('editing'); focusNext.current = true; if (field)
        window.setTimeout(() => { document.getElementById(`bridges-${next}-${field}`)?.focus(); }, 50); }
    useEffect(() => { if (focusNext.current) {
        title.current?.focus();
        focusNext.current = false;
    } }, [stage, view]);
    async function save(captured: MicrochurchData) {
        if (preview) {
            setMessage('Preview only · responses are not saved.');
            return;
        }
        const task = queue.current.then(async () => { setState('saving'); try {
            await saveMicrochurchAction(route.slug, route.moduleKey, route.lessonKey, route.sectionKey, route.blockKey, route.cohortId, captured);
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
        const missing = microchurchIssues(data);
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
            const envelope = preview ? projectMicrochurchSave({ draft: data, finished, previousResults: history }, captured, new Date().toISOString(), true, retake.current) : (await finishMicrochurchAction(route.slug, route.moduleKey, route.lessonKey, route.sectionKey, route.blockKey, route.cohortId, captured, retake.current)).envelope;
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
        return; retake.current = finished.completedAt; edit(emptyMicrochurchData()); setStage(0); setView('editing'); setHistoricalIndex(null); setMessage('Your completed assessment is preserved. This is a new draft.'); focusNext.current = true; }
    const status = finished ? 'completed' : canonical(data) !== canonical(emptyMicrochurchData()) ? 'in_progress' : 'not_started', pendingRetake = finished && canonical(data) !== canonical(finished.participantMaterial);
    if (!focused && !autoStart)
        return <AssessmentLaunchCard eyebrow={MICROCHURCH_SUBTITLE} title={MICROCHURCH_TITLE} description="Evaluate your microchurch’s worship, community, and mission." status={status} action={<button type="button" onClick={() => setFocused(true)}>{preview ? 'Preview Assessment' : assessmentLaunchLabel(status)}</button>}/>;
    const selectedResult = historicalIndex === null ? finished : history[historicalIndex];
    const results = view === 'results' && selectedResult;
    let content: ReactNode;
    if (results)
        content = <><MicrochurchResults data={results.participantMaterial} participantName={participantName} completedAt={results.completedAt}/><div className="bridges-actions bridges-no-print"><button type="button" onClick={() => window.print()}><Printer size={16} aria-hidden="true"/> Print / Save as PDF</button><button type="button" onClick={beginRetake}>Start a new assessment</button>{pendingRetake && <button type="button" onClick={() => { retake.current = finished!.completedAt; go(microchurchIssues(data)[0]?.stage ?? 4); }}>Continue new draft</button>}<button type="button" onClick={() => void close()}>{returnTo ? 'Return to course' : 'Save and close'}</button></div>{history.length > 0 && <label className="bridges-history bridges-no-print">Saved assessments<select value={historicalIndex === null ? 'current' : String(historicalIndex)} onChange={e => setHistoricalIndex(e.target.value === 'current' ? null : Number(e.target.value))}><option value="current">Most recent completed assessment</option>{history.map((item, i) => <option key={item.completedAt} value={i}>{new Date(item.completedAt).toLocaleString()}</option>)}</select></label>}</>;
    else if (stage === 0)
        content = <><h2>{MICROCHURCH_TITLE}</h2><p>{MICROCHURCH_INTRO}</p><p>UNDERGROUND · tampaunderground.com</p></>;
    else if (stage >= 1 && stage <= 3)
        content = <><p>Mark how accurately each statement describes your microchurch: 1 to 5 (most accurate).</p>{MICROCHURCH_QUESTIONS.slice((stage-1)*7,stage*7).map((question,offset)=>{const index=(stage-1)*7+offset;return <fieldset key={index} id={`bridges-${stage}-q${index+1}`} tabIndex={-1} className="microchurch-question"><legend>{index+1}. {question}</legend><div className="microchurch-ratings">{[1,2,3,4,5].map(rating=><label key={rating}><input type="radio" name={`microchurch-${route.blockKey}-${index}`} value={rating} checked={data.ratings[index]===rating} onChange={()=>edit({ratings:data.ratings.map((value,i)=>i===index?rating:value)})}/><span>{rating}</span>{rating===5&&<small>Most accurate</small>}</label>)}</div></fieldset>;})}</>;
    else
        content = <><h2>Review your responses</h2><p>Complete all 21 ratings, then choose Complete assessment to save your category scores.</p>{[1,2,3].map(part=><section key={part} className="bridges-review-section"><header><h3>Statements {(part-1)*7+1}–{part*7}</h3><button type="button" onClick={()=>go(part)}>Edit responses</button></header><dl>{MICROCHURCH_QUESTIONS.slice((part-1)*7,part*7).map((question,offset)=>{const i=(part-1)*7+offset;return <div key={i}><dt>{i+1}. {question}</dt><dd>{data.ratings[i]??'Not answered'}</dd></div>;})}</dl></section>)}</>;
    return <AssessmentFocusFrame active={focused && !autoStart} label={MICROCHURCH_TITLE} onClose={() => void close()}><NativeAssessmentShell returnTo={returnTo} showReturn={autoStart}><section className="ethos-assessment bridges-assessment" aria-label={MICROCHURCH_TITLE}><header className="ethos-intro"><div className="ethos-intro-meta"><p>{MICROCHURCH_TITLE}</p><span>{MICROCHURCH_SUBTITLE}</span></div><h1 ref={title} tabIndex={-1}>{view === 'results' ? 'Your Microchurch Assessment' : MICROCHURCH_STAGES[stage]}</h1><p>Worship, Community, and Mission</p></header>{view === 'editing' && <><nav className="bridges-stage-nav bridges-no-print" aria-label="Assessment sections">{MICROCHURCH_STAGES.map((label, i) => <button key={label} type="button" aria-current={stage === i ? 'step' : undefined} disabled={finishing} onClick={() => go(i)}>{i + 1}. {label}</button>)}</nav><div className="ethos-progress" role="progressbar" aria-label="Statements rated" aria-valuenow={data.ratings.filter(value => value !== null).length} aria-valuemin={0} aria-valuemax={21}><span>{data.ratings.filter(value => value !== null).length} of 21 statements rated</span></div></>}<div className="bridges-content"><fieldset disabled={finishing} className="bridges-editor-fields">{content}</fieldset>{issues.length > 0 && <section className="bridges-validation" role="alert" aria-label="Sections to complete"><h2>Sections to complete</h2><ul>{issues.map((issue, i) => <li key={`${issue.stage}-${issue.field}-${i}`}><button type="button" onClick={() => go(issue.stage, issue.field)}>{issue.message}</button></li>)}</ul></section>}<p className="bridges-save-status bridges-no-print" role={state === 'error' ? 'alert' : 'status'} aria-live="polite">{state === 'saving' ? 'Saving…' : message || (state === 'unsaved' ? 'Unsaved changes' : preview ? 'Preview only · responses are not saved.' : 'Save your progress and return to continue.')}</p>{view === 'editing' && <footer className="bridges-actions bridges-no-print"><button type="button" disabled={stage === 0 || finishing} onClick={() => go(stage - 1)}>Back</button><button type="button" disabled={finishing} onClick={() => void saveDraft()}>Save draft</button><button type="button" disabled={finishing} onClick={() => void close()}>Save and close</button>{stage === 4 ? <button className="is-primary" type="button" disabled={finishing} onClick={() => void complete()}>{finishing ? 'Completing…' : 'Complete assessment'}</button> : <button className="is-primary" type="button" disabled={finishing} onClick={() => go(stage + 1)}>{stage === 0 ? (status === 'not_started' ? 'Begin' : 'Continue') : 'Continue'}</button>}</footer>}{view === 'editing' && finished && <button className="bridges-no-print" type="button" onClick={() => setView('results')}>View saved assessment</button>}</div></section></NativeAssessmentShell></AssessmentFocusFrame>;
}
