import { finalizeResponseAction, saveResponseDraftAction } from "@/lib/experiences/builder/response-actions";
import type { ParticipantResponseContext } from "@/lib/experiences/builder/participant-runtime";
import { validateResponseData, validateResponseOptions, type ResponseData, type ResponseKind } from "@/lib/experiences/builder/response-registry";

type Route = Readonly<{ slug: string; moduleKey: string; lessonKey: string; sectionKey: string; blockKey: string }>;

function storedData(response: ParticipantResponseContext["response"]): unknown {
  return response?.response_data ?? ({} satisfies Record<string, never>);
}

function selected(data: ResponseData | null, key: string) {
  return data && "values" in data ? data.values.includes(key) : data && "value" in data ? data.value === key : false;
}

export function ParticipantResponseBlock({ context, route, configuration, responseKind, preview = false }: { context: ParticipantResponseContext; route: Route; configuration: Record<string, unknown>; responseKind: ResponseKind; preview?: boolean }) {
  const finalized = preview || context.response?.status === "submitted" || context.response?.status === "finalized";
  const existing = context.response ? validateResponseData(responseKind, storedData(context.response), false, context.definition.configuration) : null;
  if (existing && !existing.ok) return <section className="participant-response-block is-unavailable" role="status"><strong>This activity contains a saved legacy value that is currently unavailable.</strong></section>;
  const data = existing?.ok ? existing.value : null;
  const optionsResult = responseKind === "single_select" || responseKind === "multi_select" ? validateResponseOptions(configuration.options) : null;
  if (optionsResult && !optionsResult.ok) return <section className="participant-response-block is-unavailable" role="status"><strong>This activity is currently unavailable.</strong></section>;
  const options = optionsResult?.ok ? optionsResult.value : [];
  const textValue = data && "value" in data && typeof data.value === "string" ? data.value : "";
  const booleanValue = Boolean(data && "value" in data && data.value === true);
  const display = responseKind === "boolean" ? (booleanValue ? String(configuration.affirmativeLabel) : "No") : responseKind === "multi_select" ? options.filter((option) => selected(data, option.key)).map((option) => option.label).join(", ") : responseKind === "single_select" ? options.find((option) => selected(data, option.key))?.label ?? "" : textValue;
  return <section className="participant-response-block"><header><p>{context.definition.is_required ? "Required response" : "Optional response"}</p><h2>{context.definition.label}</h2>{context.definition.instructions && <span>{context.definition.instructions}</span>}</header>{finalized ? <div className="participant-response-final"><p>{display || "No response provided."}</p><small>Response submitted</small></div> : <form>{responseKind === "short_text" || responseKind === "long_text" ? <><label htmlFor={`response-${context.definition.id}`} className="sr-only">{context.definition.label}</label><textarea id={`response-${context.definition.id}`} name="response" defaultValue={textValue} placeholder={String(configuration.placeholder ?? "")} maxLength={Number(configuration.maxLength) || (responseKind === "long_text" ? 8000 : 500)} rows={responseKind === "long_text" ? 10 : 4} required={context.definition.is_required}/></> : responseKind === "boolean" ? <label className="participant-choice"><input type="checkbox" name="response" value="true" defaultChecked={booleanValue} required={context.definition.is_required}/><span><strong>{String(configuration.affirmativeLabel)}</strong></span></label> : <fieldset><legend className="sr-only">{context.definition.label}</legend>{options.map((option) => <label className="participant-choice" key={option.key}><input type={responseKind === "single_select" ? "radio" : "checkbox"} name="response" value={option.key} defaultChecked={selected(data, option.key)} required={responseKind === "single_select" && context.definition.is_required}/><span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span></label>)}</fieldset>}<div><button formAction={saveResponseDraftAction.bind(null, route.slug, route.moduleKey, route.lessonKey, route.sectionKey, route.blockKey)} type="submit">Save draft</button><button className="is-primary" formAction={finalizeResponseAction.bind(null, route.slug, route.moduleKey, route.lessonKey, route.sectionKey, route.blockKey)} type="submit">Submit response</button></div><small>Private to you. Submission is final.</small></form>}</section>;
}
