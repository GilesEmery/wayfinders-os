import {ConfirmationChoice} from "./ConfirmationChoice";
import {MultiSelectChoices} from "./MultiSelectChoices";
import {SingleSelectChoices} from "./SingleSelectChoices";
import { ParticipantResponseForm } from "./ParticipantResponseForm";
import type { ParticipantResponseContext } from "@/lib/experiences/builder/participant-runtime";
import { validateResponseData, validateResponseOptions, type ResponseData, type ResponseKind } from "@/lib/experiences/builder/response-registry";

type Route = Readonly<{ slug: string; moduleKey: string; lessonKey: string; sectionKey: string; blockKey: string; cohortId?: string | null }>;

function storedData(response: ParticipantResponseContext["response"]): unknown {
  return response?.response_data ?? ({} satisfies Record<string, never>);
}

function selected(data: ResponseData | null, key: string) {
  return data && "values" in data ? data.values.includes(key) : data && "value" in data ? data.value === key : false;
}

export function ParticipantResponseBlock({ context, route, configuration, responseKind, preview = false, allowFinalizedEditing = false,showHeader=true,interactivePreview=false,answerRows }: { context: ParticipantResponseContext; route: Route; configuration: Record<string, unknown>; responseKind: ResponseKind; preview?: boolean; allowFinalizedEditing?: boolean;showHeader?:boolean;interactivePreview?:boolean;answerRows?:number }) {
  const finalized = context.response?.status === "submitted" || context.response?.status === "finalized";
  const existing = context.response ? validateResponseData(responseKind, storedData(context.response), false, context.definition.configuration) : null;
  if (existing && !existing.ok) return <section className="participant-response-block is-unavailable" role="status"><strong>This activity contains a saved legacy value that is currently unavailable.</strong></section>;
  const data = existing?.ok ? existing.value : null;
  const optionsResult = responseKind === "single_select" || responseKind === "multi_select" ? validateResponseOptions(configuration.options,responseKind==="single_select"?Infinity:50) : null;
  if (optionsResult && !optionsResult.ok) return <section className="participant-response-block is-unavailable" role="status"><strong>This activity is currently unavailable.</strong></section>;
  const options = optionsResult?.ok ? optionsResult.value : [];
  const textValue = data && "value" in data && typeof data.value === "string" ? data.value : "";
  const booleanValue = Boolean(data && "value" in data && data.value === true);
  const display = responseKind === "boolean" ? (booleanValue ? String(configuration.affirmativeLabel) : "Not confirmed") : responseKind === "multi_select" ? options.filter((option) => selected(data, option.key)).map((option) => option.label).join(", ") : responseKind === "single_select" ? options.find((option) => selected(data, option.key))?.label ?? "" : textValue;
  const editable = !finalized || allowFinalizedEditing;
  return <section className="participant-response-block" data-response-kind={responseKind}>{showHeader&&<header><p>{context.definition.is_required ? "Required response" : "Optional response"}</p><h3>{context.definition.label}</h3>{context.definition.instructions && <span>{context.definition.instructions}</span>}</header>}{!editable ? <div className="participant-response-final"><p>{display || "No response provided."}</p><small>Response submitted</small>{responseKind==="single_select"&&configuration.questionPurpose==="knowledge"&&Boolean(configuration.correctAnswerKey)&&<p>{textValue===configuration.correctAnswerKey?`Correct${Number(configuration.points)>0?` · ${configuration.points} self-check points`:''}`:'Review your answer.'}</p>}{responseKind==="single_select"&&Boolean(configuration.feedback)&&<p>{String(configuration.feedback)}</p>}</div> : <ParticipantResponseForm route={route} preview={preview}><input type="hidden" name="response_revision" value={context.response?.updated_at ?? ""}/><fieldset disabled={preview&&!interactivePreview}>{responseKind === "short_text" || responseKind === "long_text" ? <><label htmlFor={`response-${context.definition.id}`} className="sr-only">{context.definition.label}</label><textarea id={`response-${context.definition.id}`} name="response" defaultValue={textValue} placeholder={String(configuration.placeholder ?? "")} maxLength={Number(configuration.maxLength) || (responseKind === "long_text" ? 8000 : 500)} rows={answerRows??(responseKind === "long_text" ? 10 : 4)} required={context.definition.is_required}/></> : responseKind === "boolean" ? <ConfirmationChoice configuration={configuration} initial={booleanValue} required={context.definition.is_required} legend={context.definition.label}/> : responseKind==="single_select"?<SingleSelectChoices options={options} initial={textValue} display={String(configuration.displayStyle||"list")} columns={Number(configuration.cardColumns)||2} required={context.definition.is_required} legend={context.definition.label}/>: <MultiSelectChoices options={options} initial={data&&"values" in data?data.values:[]} display={String(configuration.displayStyle||"list")} columns={Number(configuration.cardColumns)||2} required={context.definition.is_required} configuration={configuration} legend={context.definition.label}/>}</fieldset>{preview ? <small>Preview only · Responses are not saved</small> : allowFinalizedEditing && finalized ? <><div><button className="is-primary" data-save-mode="final" type="submit">Update response</button></div><small>Submitting replaces your previous response with this new answer.</small></> : <><div><button data-save-mode="draft" formNoValidate type="submit">Save draft</button><button className="is-primary" data-save-mode="final" type="submit">Submit response</button></div></>}</ParticipantResponseForm>}</section>;
}
