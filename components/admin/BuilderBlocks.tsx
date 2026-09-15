import type { Tables } from "@/lib/supabase/database.types";
import { BLOCK_DEFINITIONS, getBlockDefinition } from "@/lib/experiences/builder/block-registry";
import { humanize } from "@/lib/admin/format";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { BlockChoiceEditor } from "./BlockChoiceEditor";
import { ParticipantMediaBlock } from "@/components/experiences/builder/ParticipantMediaBlock";
import { ParticipantRichText } from "@/components/experiences/builder/ParticipantRichText";
import {
  createBlockAction,
  deleteBlockAction,
  duplicateBlockAction,
  moveBlockAction,
  reorderBlockAction,
  updateBlockAction,
} from "@/app/admin/trainings/[experienceId]/versions/[versionId]/sections/[sectionId]/layout/actions";

type Route = { experienceId: string; versionId: string; sectionId: string };
type Block = Tables<"content_blocks">;
type Column = Tables<"section_columns">;
type ResponseDefinition = Tables<"response_definitions">;

function value(configuration: Record<string, unknown>, key: string) {
  return typeof configuration[key] === "string" ? configuration[key] as string : "";
}

function configuration(block: Block) {
  return block.content && typeof block.content === "object" && !Array.isArray(block.content) ? block.content as Record<string, unknown> : {};
}

function OptionFields({ config, multi }: { config: Record<string, unknown>; multi: boolean }) {
  const options = Array.isArray(config.options) ? config.options.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
  return <BlockChoiceEditor options={options.map((option, id) => ({ id, key: String(option.key ?? ""), label: String(option.label ?? ""), description: String(option.description ?? "") }))} multi={multi} min={Number(config.minSelections ?? 0)} max={Number(config.maxSelections ?? Math.max(1, options.length))}/>;
}

function BlockPreview({ block, responseDefinition }: { block: Block; responseDefinition?: ResponseDefinition }) {
  const definition = getBlockDefinition(block.block_type);
  if (!definition) return <div className="builder-block-unavailable"><strong>Unavailable Block Type</strong><span>Block type: {block.block_type}</span><p>This Block is preserved, but its current renderer and editor are unavailable.</p></div>;
  const parsed = definition.validateConfiguration(block.content);
  if (!parsed.ok) return <div className="builder-block-unavailable"><strong>Invalid Block Configuration</strong><span>Block type: {block.block_type}</span><p>{parsed.errors.join(" ")}</p></div>;
  const config = parsed.value;
  if (definition.previewKey === "heading") {
    const eyebrow = value(config, "eyebrow");
    const text = value(config, "text");
    const level = value(config, "level");
    return <div className={`builder-heading-preview is-${value(config, "alignment") || "left"}`}>{eyebrow && <span>{eyebrow}</span>}{level === "h4" ? <h4>{text}</h4> : level === "h3" ? <h3>{text}</h3> : <h2>{text}</h2>}</div>;
  }
  if (definition.previewKey === "rich_text") return <ParticipantRichText title={value(config, "title")} text={value(config, "text")}/>;
  if (definition.previewKey === "media") return value(config, "url") ? <ParticipantMediaBlock kind={block.block_type as "video" | "image" | "document" | "download" | "external_link"} config={config}/> : <div className="builder-response-preview"><strong>{value(config, "title") || definition.label}</strong><p>Add an HTTPS source to make this available to participants.</p></div>;
  if (definition.previewKey === "response") return <div className="builder-response-preview"><strong>{responseDefinition?.label ?? "Response definition unavailable"}</strong>{responseDefinition?.instructions && <p>{responseDefinition.instructions}</p>}<span>{definition.label} · {responseDefinition?.is_required ? "Required" : "Optional"} · Private</span></div>;
  return <aside className={`builder-callout-preview is-${value(config, "treatment") || "info"}`}>{value(config, "title") && <strong>{value(config, "title")}</strong>}<p>{value(config, "body")}</p></aside>;
}

function EditorFields({ block, responseDefinition }: { block: Block; responseDefinition?: ResponseDefinition }) {
  const definition = getBlockDefinition(block.block_type);
  if (!definition) return null;
  const config = configuration(block);
  if (definition.editorKey === "heading") return <><label className="is-wide">Heading text<input name="text" defaultValue={value(config, "text")} maxLength={240} required/></label><label>Level<select name="level" defaultValue={value(config, "level") || "h2"}><option value="h2">H2</option><option value="h3">H3</option><option value="h4">H4</option></select></label><label>Alignment<select name="alignment" defaultValue={value(config, "alignment") || "left"}><option value="left">Left</option><option value="center">Center</option></select></label><label className="is-wide">Eyebrow<input name="eyebrow" defaultValue={value(config, "eyebrow")} maxLength={120}/></label></>;
  if (definition.editorKey === "rich_text") return <><label className="is-wide">Title (optional)<input name="title" defaultValue={value(config, "title")} maxLength={200}/></label><label className="is-wide">Content<textarea name="text" defaultValue={value(config, "text")} maxLength={12000} rows={8} required/><span className="admin-field-note">Use Markdown-style headings, lists, emphasis and HTTPS links. Raw HTML is displayed as text.</span></label></>;
  if (definition.editorKey === "media") return <><label className="is-wide">Title<input name="title" defaultValue={value(config, "title")} maxLength={200} required={block.block_type === "document" || block.block_type === "download" || block.block_type === "external_link"}/></label><label className="is-wide">Description<textarea name="description" defaultValue={value(config, "description")} maxLength={3000} rows={3}/></label><label className="is-wide">HTTPS source URL<input name="url" type="url" pattern="https://.*" placeholder="https://" defaultValue={value(config, "url")} maxLength={2048} required/><span className="admin-field-note">Use a public HTTPS URL. Uploads and private Storage files are not available in this editor.</span></label>{block.block_type === "image" && <label className="is-wide">Image description for accessibility<input name="alt" defaultValue={value(config, "alt")} maxLength={300} required/></label>}{(block.block_type === "video" || block.block_type === "image") && <label className="is-wide">Caption<input name="caption" defaultValue={value(config, "caption")} maxLength={1000}/></label>}{(block.block_type === "document" || block.block_type === "download" || block.block_type === "external_link") && <label className="is-wide">Action label<input name="link_label" defaultValue={value(config, "linkLabel")} maxLength={120} placeholder="Open resource"/></label>}</>;
  if (definition.editorKey === "response") {
    const kind = definition.response?.responseKind;
    return <><label className="is-wide">Question or prompt<input name="prompt" defaultValue={responseDefinition?.label ?? definition.label} maxLength={240} required/></label><label className="is-wide">Supporting text / instructions<textarea name="instructions" defaultValue={responseDefinition?.instructions ?? ""} maxLength={3000} rows={3}/></label>{kind === "short_text" || kind === "long_text" ? <><label className="is-wide">Placeholder<input name="placeholder" defaultValue={value(config, "placeholder")} maxLength={240}/></label><label>Character limit<input name="max_length" defaultValue={Number(config.maxLength) || (kind === "long_text" ? 8000 : 500)} min="1" max="8000" type="number" required/></label></> : kind === "single_select" || kind === "multi_select" ? <OptionFields config={config} multi={kind === "multi_select"}/> : <label className="is-wide">Acknowledgement checkbox label<input name="affirmative_label" defaultValue={value(config, "affirmativeLabel")} maxLength={200} required/><span className="admin-field-note">This Block is one checkbox. Participants may check or uncheck it; it is not a two-choice Yes/No question.</span></label>}<p className="admin-field-note is-wide">Completion: response submitted. Participants can save a draft, then finalize their private response.</p></>;
  }
  return <><label className="is-wide">Title<input name="title" defaultValue={value(config, "title")} maxLength={180}/></label><label className="is-wide">Body<textarea name="body" defaultValue={value(config, "body")} maxLength={4000} rows={5} required/></label><label>Treatment<select name="treatment" defaultValue={value(config, "treatment") || "info"}><option value="info">Info</option><option value="emphasis">Emphasis</option><option value="warning">Warning</option><option value="success">Success</option></select></label></>;
}

function BlockCard({ block, blocks, columns, responseDefinition, route, editable }: { block: Block; blocks: Block[]; columns: Column[]; responseDefinition?: ResponseDefinition; route: Route; editable: boolean }) {
  const definition = getBlockDefinition(block.block_type);
  const siblings = blocks.filter((candidate) => candidate.column_id === block.column_id);
  const targetColumns = columns.filter((column) => column.id !== block.column_id);
  const index = siblings.findIndex((candidate) => candidate.id === block.id);
  return <article className={`builder-block-card${definition ? "" : " is-unavailable"}`}>
    <header><div><span>{definition?.category ?? "Unavailable"}</span><strong>{definition?.label ?? "Unavailable Block Type"}</strong><small>{block.block_key} · {humanize(block.visibility)} · {humanize(block.requirement_level)}</small></div>{editable && <div className="builder-block-order"><form action={reorderBlockAction.bind(null, route.experienceId, route.versionId, route.sectionId, block.id, "up")}><button disabled={index === 0} type="submit" aria-label={`Move ${definition?.label ?? block.block_type} up`}>↑</button></form><form action={reorderBlockAction.bind(null, route.experienceId, route.versionId, route.sectionId, block.id, "down")}><button disabled={index === siblings.length - 1} type="submit" aria-label={`Move ${definition?.label ?? block.block_type} down`}>↓</button></form></div>}</header>
    <div className="builder-block-preview"><BlockPreview block={block} responseDefinition={responseDefinition}/></div>
    {!definition && <details className="builder-block-metadata"><summary>Inspect stored metadata</summary><dl><div><dt>Renderer key</dt><dd>{block.custom_renderer_key ?? "None"}</dd></div><div><dt>Metadata</dt><dd><pre>{JSON.stringify(block.metadata, null, 2)}</pre></dd></div></dl></details>}
    {editable && <div className="builder-block-controls">
      {definition && <details open={(definition.supportsResponse && responseDefinition?.label === definition.label) || (definition.editorKey === "media" && !value(configuration(block), "url")) ? true : undefined}><summary>Author {definition.supportsResponse ? "response" : "Block"}</summary><form action={updateBlockAction.bind(null, route.experienceId, route.versionId, route.sectionId, block.id)} className="admin-form builder-block-form"><EditorFields block={block} responseDefinition={responseDefinition}/><label>Required or optional<select name="requirement_level" defaultValue={block.requirement_level}><option value="required">Required</option><option value="recommended">Recommended</option><option value="optional">Optional</option></select></label><label>Visibility<select name="visibility" defaultValue={block.visibility}><option value="visible">Visible</option><option value="hidden">Hidden</option></select></label><button className="admin-primary" type="submit">Save Block</button></form></details>}
      <div className="builder-block-secondary-actions">{definition?.duplicable && <form action={duplicateBlockAction.bind(null, route.experienceId, route.versionId, route.sectionId, block.id)}><button type="submit">Duplicate</button></form>}{targetColumns.length > 0 && <form action={moveBlockAction.bind(null, route.experienceId, route.versionId, route.sectionId, block.id)}><label>Move to<select name="target_column_id" defaultValue={targetColumns[0].id}>{targetColumns.map((column) => <option key={column.id} value={column.id}>{column.label || humanize(column.column_key)}</option>)}</select></label><button type="submit">Move</button></form>}<details className="builder-block-delete"><summary>Delete</summary><form action={deleteBlockAction.bind(null, route.experienceId, route.versionId, route.sectionId, block.id)}><label><input name="confirm" type="checkbox" required/> Confirm permanent deletion</label><button type="submit">Delete Block</button></form></details></div>
    </div>}
  </article>;
}

export async function BuilderColumnBlocks({ column, columns, blocks, route, editable }: { column: Column; columns: Column[]; blocks: Block[]; route: Route; editable: boolean }) {
  const columnBlocks = blocks.filter((block) => block.column_id === column.id);
  const responseResult = columnBlocks.length ? await createAdminSupabaseClient().from("response_definitions").select("*").in("block_id", columnBlocks.map((block) => block.id)) : { data: [], error: null };
  const responseDefinitions = responseResult.data ?? [];
  return <div className="builder-column-blocks">
    <div className="builder-block-list">{columnBlocks.map((block) => <BlockCard block={block} blocks={blocks} columns={columns} responseDefinition={responseDefinitions.find((item) => item.block_id === block.id)} route={route} editable={editable} key={block.id}/>)}{columnBlocks.length === 0 && <p className="builder-block-empty">No Content yet. Add the first item to this column.</p>}</div>
    {editable && <details className="builder-block-library"><summary>Add Content</summary>{([{"label":"Content","category":"content"},{"label":"Media","category":"media"},{"label":"Resources","category":"resource"},{"label":"Reflection + Response","category":"interaction"}] as const).map(group => <div key={group.category}><p>{group.label}</p>{BLOCK_DEFINITIONS.filter((definition) => definition.availability === "available" && definition.category === group.category).map((definition) => <form action={createBlockAction.bind(null, route.experienceId, route.versionId, route.sectionId, column.id, definition.blockType)} key={definition.blockType}><button type="submit"><strong>{definition.label}</strong><span>{definition.description}</span></button></form>)}</div>)}</details>}
  </div>;
}
