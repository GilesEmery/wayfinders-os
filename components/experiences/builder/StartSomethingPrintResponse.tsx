import { START_SOMETHING_PROMPTS, START_SOMETHING_STAGES, type StartSomethingData } from "@/lib/experiences/builder/start-something";

export function StartSomethingPrintResponse({ data }: { data: StartSomethingData }) {
  const sections = [data.idea, data.inventory, data.vision, data.strategy];
  return <article className="start-something-print-document" aria-label="Printable Start Something response">
    <style media="print">{"@page { size: letter portrait; margin: 1in; }"}</style>
    <header><p>Start Something · Personal workbook</p><h1>Your idea.<br/>Your next chapter.</h1><span>A record of your reflections and the steps ahead.</span></header>
    <aside className="ss-print-direction"><p>Your direction</p><blockquote>{data.vision.vision_statement || data.idea.idea_summary || "A beginning worth exploring."}</blockquote><div><strong>Where I am</strong><span>{data.next_steps.timeline_stage || "Not selected"}</span></div></aside>
    {sections.map((section, index) => <section key={index}><h2><span>0{index + 1}</span>{START_SOMETHING_STAGES[index]}</h2><dl>{Object.entries(section).map(([key, value]) => <div key={key}><dt>{START_SOMETHING_PROMPTS[key as keyof typeof START_SOMETHING_PROMPTS]}</dt><dd>{(Array.isArray(value) ? value.filter(Boolean).join(" · ") : value).trim() || "Not answered"}</dd></div>)}</dl></section>)}
    <section><h2><span>05</span>{START_SOMETHING_STAGES[4]}</h2><dl><div><dt>Connection settings</dt><dd>{data.network.places.join(" · ") || "Not answered"}{data.network.other && ` · ${data.network.other}`}</dd></div>{data.network.locations.filter(location => location.location || location.names.some(Boolean)).map((location, index) => <div key={index}><dt>{location.location || `Location ${index + 1}`}</dt><dd>{location.names.filter(Boolean).join(" · ") || "No connections added"}</dd></div>)}<div><dt>Additional locations and names</dt><dd>{data.network.additional_locations || "Not answered"}</dd></div><div><dt>Indirect connections</dt><dd>{data.network.indirect_connections || "Not answered"}</dd></div></dl></section>
    <section className="ss-print-next"><h2><span>06</span>{START_SOMETHING_STAGES[5]}</h2><dl><div><dt>Current stage</dt><dd>{data.next_steps.timeline_stage || "Not selected"}</dd></div><div><dt>My plan for the next two weeks</dt><dd>{data.next_steps.two_week_plan || "Not answered"}</dd></div></dl></section>
    <footer><strong>Start Something</strong><span>Thoughtful reflection. Meaningful action.</span></footer>
  </article>;
}
