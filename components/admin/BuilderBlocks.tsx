import type { Tables } from "@/lib/supabase/database.types";
import { BLOCK_DEFINITIONS, getBlockDefinition, getParticipantBlockDefinition } from "@/lib/experiences/builder/block-registry";
import { humanize } from "@/lib/admin/format";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { BlockChoiceEditor } from "./BlockChoiceEditor";
import { ParticipantMediaBlock } from "@/components/experiences/builder/ParticipantMediaBlock";
import { ParticipantPdfReader } from "@/components/experiences/builder/ParticipantPdfReader";
import { ParticipantRichText } from "@/components/experiences/builder/ParticipantRichText";
import { ParticipantResponseBlock } from "@/components/experiences/builder/ParticipantResponseBlock";
import {
  createBlockAction,
  deleteBlockAction,
  dragBlockAction,
  duplicateBlockAction,
  moveBlockAction,
  reorderBlockAction,
  saveInlineBlockAction,
  setBlockAssetAction,
  updateBlockAction,
  updateBlockSettingsAction,
} from "@/app/admin/trainings/[experienceId]/versions/[versionId]/sections/[sectionId]/layout/actions";
import { listCourseAssets, resolveCourseAssets, type ResolvedAsset } from "@/lib/experiences/builder/resource-assets";
import { AssetSelect } from "./AssetSelect";
import { InlineTextBlockEditor } from "./InlineTextBlockEditor";
import { CurriculumDragItem } from "./CurriculumDragItem";
import { EthosAssessment } from "@/components/experiences/builder/EthosAssessment";
import { ETHOS_RENDERER_KEY } from "@/lib/experiences/builder/ethos-assessment";
import { ActivatePurposeAssessment } from "@/components/experiences/builder/ActivatePurposeAssessment";
import { ACTIVATE_PURPOSE_RENDERER_KEY } from "@/lib/experiences/builder/activate-purpose-assessment";
import { LaunchingWayfindersHubAssessment } from "@/components/experiences/builder/LaunchingWayfindersHubAssessment";
import { LAUNCHING_WAYFINDERS_HUB_RENDERER_KEY } from "@/lib/experiences/builder/launching-wayfinders-hub-assessment";
import { Fragment } from "react";

type Route = { experienceId: string; versionId: string; sectionId: string };
type Block = Tables<"content_blocks">;
type Column = Tables<"section_columns">;
type ResponseDefinition = Tables<"response_definitions">;

const BLOCK_LIBRARY_GROUPS = [{ label: "Content", category: "content" }, { label: "Media", category: "media" }, { label: "Resources", category: "resource" }, { label: "Reflection + Response", category: "interaction" }] as const;

function BlockLibrary({ route, columnId, position }: { route: Route; columnId: string; position?: number }) {
  const inline = Number.isInteger(position);
  return <details className={`builder-block-library${inline ? " is-inline-insertion" : ""}`}><summary>{inline ? "+ Add Content here" : "Add Content"}</summary>{BLOCK_LIBRARY_GROUPS.map((group) => <div key={group.category}><p>{group.label}</p>{BLOCK_DEFINITIONS.filter((definition) => definition.availability === "available" && definition.category === group.category && definition.blockType !== "download").map((definition) => <form action={createBlockAction.bind(null, route.experienceId, route.versionId, route.sectionId, columnId, definition.blockType, position)} key={definition.blockType}><button type="submit"><strong>{definition.label}</strong><span>{definition.description}</span></button></form>)}</div>)}</details>;
}

function value(configuration: Record<string, unknown>, key: string) {
  return typeof configuration[key] === "string" ? configuration[key] as string : "";
}

function configuration(block: Block) {
  return block.content && typeof block.content === "object" && !Array.isArray(block.content) ? block.content as Record<string, unknown> : {};
}

function emptyAssetCopy(blockType: string) {
  if (blockType === "image") return { title: "Add an image", description: "Upload a new image or choose one you already uploaded." };
  if (blockType === "pdf_reader") return { title: "Add a PDF", description: "Upload a PDF or choose one from the existing asset library." };
  return { title: "Add a document or file", description: "Upload a PDF, document, worksheet, or other file, or choose an existing asset." };
}

function OptionFields({ config, multi }: { config: Record<string, unknown>; multi: boolean }) {
  const options = Array.isArray(config.options) ? config.options.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
  return <BlockChoiceEditor options={options.map((option, id) => ({ id, key: String(option.key ?? ""), label: String(option.label ?? ""), description: String(option.description ?? "") }))} multi={multi} min={Number(config.minSelections ?? 0)} max={Number(config.maxSelections ?? Math.max(1, options.length))}/>;
}

function BlockPreview({ block, responseDefinition, asset }: { block: Block; responseDefinition?: ResponseDefinition; asset?: ResolvedAsset }) {
  const participantDefinition = getParticipantBlockDefinition(block.block_type, block.custom_renderer_key);
  if (!participantDefinition) return <div className="builder-block-unavailable"><strong>Unavailable Block Type</strong><span>Block type: {block.block_type}</span><p>This Block is preserved, but its current renderer and editor are unavailable.</p></div>;
  if (block.block_type === "system_component" && block.custom_renderer_key === ETHOS_RENDERER_KEY) return <EthosAssessment initialData={{}} route={{ slug: "", moduleKey: "", lessonKey: "", sectionKey: "", blockKey: block.block_key }} preview/>;
  if (block.block_type === "custom_component" && block.custom_renderer_key === ACTIVATE_PURPOSE_RENDERER_KEY) return <ActivatePurposeAssessment initialData={{}} route={{ slug: "", moduleKey: "", lessonKey: "", sectionKey: "", blockKey: block.block_key }} preview/>;
  if (block.block_type === "custom_component" && block.custom_renderer_key === LAUNCHING_WAYFINDERS_HUB_RENDERER_KEY) return <LaunchingWayfindersHubAssessment initialData={{}} route={{ slug: "", moduleKey: "", lessonKey: "", sectionKey: "", blockKey: block.block_key }} preview/>;
  const definition = participantDefinition;
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
  if (definition.previewKey === "pdf_reader") return asset ? <ParticipantPdfReader config={config} asset={asset}/> : <div className="builder-response-preview"><strong>Add a PDF</strong><p>Upload a PDF or choose one from the existing asset library.</p></div>;
  if (definition.previewKey === "media") {
    if (value(config, "url") || asset) return <ParticipantMediaBlock kind={block.block_type as "video" | "image" | "document" | "download" | "external_link"} config={config} asset={asset}/>;
    const empty = emptyAssetCopy(block.block_type);
    return <div className="builder-response-preview"><strong>{empty.title}</strong><p>{empty.description}</p></div>;
  }
  if (definition.previewKey === "response") return responseDefinition && definition.response ? <ParticipantResponseBlock context={{ definition: responseDefinition, response: null }} route={{ slug: "", moduleKey: "", lessonKey: "", sectionKey: "", blockKey: "" }} configuration={config} responseKind={definition.response.responseKind} preview/> : <div className="builder-response-preview"><strong>Response definition unavailable</strong><p>Open Details to finish this activity.</p></div>;
  return <aside className={`builder-callout-preview is-${value(config, "treatment") || "info"}`}>{value(config, "title") && <strong>{value(config, "title")}</strong>}<p>{value(config, "body")}</p></aside>;
}

function EditorFields({ block, responseDefinition }: { block: Block; responseDefinition?: ResponseDefinition }) {
  const definition = getBlockDefinition(block.block_type);
  if (!definition) return null;
  const config = configuration(block);
  if (definition.editorKey === "heading") return <><label className="is-wide">Heading text<input name="text" defaultValue={value(config, "text")} maxLength={240} required/></label><label>Level<select name="level" defaultValue={value(config, "level") || "h2"}><option value="h2">H2</option><option value="h3">H3</option><option value="h4">H4</option></select></label><label>Alignment<select name="alignment" defaultValue={value(config, "alignment") || "left"}><option value="left">Left</option><option value="center">Center</option></select></label><label className="is-wide">Eyebrow<input name="eyebrow" defaultValue={value(config, "eyebrow")} maxLength={120}/></label></>;
  if (definition.editorKey === "rich_text") return <><label className="is-wide">Title (optional)<input name="title" defaultValue={value(config, "title")} maxLength={200}/></label><label className="is-wide">Content<textarea name="text" defaultValue={value(config, "text")} maxLength={12000} rows={8} required/><span className="admin-field-note">Use Markdown-style headings, lists, emphasis and HTTPS links. Raw HTML is displayed as text.</span></label></>;
  if (definition.editorKey === "pdf_reader") {
    const readerMode = value(config, "readerMode") === "slides" ? "slides" : "reader";
    return <><label className="is-wide">Display title (optional)<input name="title" defaultValue={value(config, "title")} maxLength={200}/></label><label className="is-wide">Description (optional)<textarea name="description" defaultValue={value(config, "description")} maxLength={3000} rows={3}/></label><fieldset className="is-wide pdf-capabilities"><legend>PDF options</legend><label><input name="show_reader" type="checkbox" defaultChecked={config.showReader !== false}/> Embedded reader</label><label><input name="allow_download" type="checkbox" defaultChecked={config.allowDownload !== false}/> Download button</label><label><input name="allow_open_in_new_tab" type="checkbox" defaultChecked={config.allowOpenInNewTab !== false}/> Open in new tab button</label><span className="admin-field-note">Choose at least one option. Turning off the reader removes the page preview and pop-up viewer.</span></fieldset><label>Reader style<select name="reader_mode" defaultValue={readerMode}><option value="reader">Document / Workbook</option><option value="slides">Slides / Presentation</option></select><span className="admin-field-note">Used only when the embedded reader is enabled. Slides supports left/right arrow-key navigation in the pop-up.</span></label></>;
  }
  if (definition.editorKey === "media") {
    const hasExternalSource = block.block_type === "video" || block.block_type === "external_link";
    return <><label className="is-wide">Display title<input name="title" defaultValue={value(config, "title")} maxLength={200} required={block.block_type === "document" || block.block_type === "download" || block.block_type === "external_link"}/></label><label className="is-wide">Description<textarea name="description" defaultValue={value(config, "description")} maxLength={3000} rows={3}/></label>{hasExternalSource ? <label className="is-wide">{block.block_type === "video" ? "Supported provider URL" : "External website URL"}<input name="url" type="url" pattern="https://.*" placeholder="https://" defaultValue={value(config, "url")} maxLength={2048} required/><span className="admin-field-note">{block.block_type === "video" ? "Embed a video from a supported external provider." : "Link to an external website or resource using HTTPS."}</span></label> : <input name="url" type="hidden" value={value(config, "url")}/>} {block.block_type === "image" && <label className="is-wide">Image description for accessibility<input name="alt" defaultValue={value(config, "alt")} maxLength={300} required/></label>}{(block.block_type === "video" || block.block_type === "image") && <label className="is-wide">Caption<input name="caption" defaultValue={value(config, "caption")} maxLength={1000}/></label>}{block.block_type === "external_link" ? <label className="is-wide">Action label<input name="link_label" defaultValue={value(config, "linkLabel")} maxLength={120} placeholder="Visit resource"/></label> : <input name="link_label" type="hidden" value={value(config, "linkLabel")}/>}</>;
  }
  if (definition.editorKey === "response") {
    const kind = definition.response?.responseKind;
    return <><label className="is-wide">Question or prompt<input name="prompt" defaultValue={responseDefinition?.label ?? definition.label} maxLength={240} required/></label><label className="is-wide">Supporting text / instructions<textarea name="instructions" defaultValue={responseDefinition?.instructions ?? ""} maxLength={3000} rows={3}/></label>{kind === "short_text" || kind === "long_text" ? <><label className="is-wide">Placeholder<input name="placeholder" defaultValue={value(config, "placeholder")} maxLength={240}/></label><label>Character limit<input name="max_length" defaultValue={Number(config.maxLength) || (kind === "long_text" ? 8000 : 500)} min="1" max="8000" type="number" required/></label></> : kind === "single_select" || kind === "multi_select" ? <OptionFields config={config} multi={kind === "multi_select"}/> : <label className="is-wide">Acknowledgement checkbox label<input name="affirmative_label" defaultValue={value(config, "affirmativeLabel")} maxLength={200} required/><span className="admin-field-note">This Block is one checkbox. Participants may check or uncheck it; it is not a two-choice Yes/No question.</span></label>}<p className="admin-field-note is-wide">Completion: response submitted. Participants can save a draft, then finalize their private response.</p></>;
  }
  return <><label className="is-wide">Title<input name="title" defaultValue={value(config, "title")} maxLength={180}/></label><label className="is-wide">Body<textarea name="body" defaultValue={value(config, "body")} maxLength={4000} rows={5} required/></label><label>Treatment<select name="treatment" defaultValue={value(config, "treatment") || "info"}><option value="info">Info</option><option value="emphasis">Emphasis</option><option value="warning">Warning</option><option value="success">Success</option></select></label></>;
}

function BlockCard({ block, blocks, columns, responseDefinition, asset, availableAssets, route, editable, selected }: { block: Block; blocks: Block[]; columns: Column[]; responseDefinition?: ResponseDefinition; asset?: ResolvedAsset; availableAssets: Awaited<ReturnType<typeof listCourseAssets>>; route: Route; editable: boolean; selected: boolean }) {
  const definition = getBlockDefinition(block.block_type);
  const siblings = blocks.filter((candidate) => candidate.column_id === block.column_id);
  const targetColumns = columns.filter((column) => column.id !== block.column_id);
  const index = siblings.findIndex((candidate) => candidate.id === block.id);
  const inline = definition?.editorKey === "heading" || definition?.editorKey === "rich_text" || definition?.editorKey === "callout";
  const directInline = definition?.editorKey === "heading" || definition?.editorKey === "rich_text";
  const nativeAsset = ["image", "pdf_reader", "document", "download"].includes(block.block_type);
  const config = configuration(block);
  const card = <article className={`builder-block-card${definition ? "" : " is-unavailable"}${selected ? " is-selected" : ""}`}>
    <header><div><span>{definition?.category === "custom_assessment" ? "Custom assessment" : definition?.category ?? "Unavailable"}</span><strong>{definition?.label ?? "Unavailable Block Type"}</strong><small>{block.block_key} · {humanize(block.visibility)} · {humanize(block.requirement_level)}</small></div></header>
    <div className="builder-block-preview">{editable && directInline ? <InlineTextBlockEditor blockId={block.id} kind={definition!.editorKey as "heading" | "rich_text"} text={value(config, definition!.editorKey === "heading" ? "text" : "text")} title={value(config, "title")} level={(value(config, "level") || "h2") as "h2" | "h3" | "h4"} alignment={(value(config, "alignment") || "left") as "left" | "center"} eyebrow={value(config, "eyebrow")} requirementLevel={block.requirement_level} visibility={block.visibility} saveAction={saveInlineBlockAction.bind(null, route.experienceId, route.versionId, route.sectionId, block.id)}/> : editable && inline ? <details className="builder-inline-edit"><summary aria-label={`Edit ${definition?.label ?? "content"}`}><BlockPreview block={block} responseDefinition={responseDefinition} asset={asset}/><span>Edit content</span></summary><form action={updateBlockAction.bind(null, route.experienceId, route.versionId, route.sectionId, block.id)} className="admin-form builder-block-form"><EditorFields block={block} responseDefinition={responseDefinition}/><input type="hidden" name="requirement_level" value={block.requirement_level}/><input type="hidden" name="visibility" value={block.visibility}/><button className="admin-primary" type="submit">Save content</button></form></details> : <BlockPreview block={block} responseDefinition={responseDefinition} asset={asset}/>}</div>
    {!definition && <details className="builder-block-metadata"><summary>Inspect stored metadata</summary><dl><div><dt>Renderer key</dt><dd>{block.custom_renderer_key ?? "None"}</dd></div><div><dt>Metadata</dt><dd><pre>{JSON.stringify(block.metadata, null, 2)}</pre></dd></div></dl></details>}
    {editable && <div className="builder-block-controls">
      {nativeAsset && <details className="builder-block-asset" open={selected || !asset}><summary>{asset ? "Replace attached file" : emptyAssetCopy(block.block_type).title}</summary><div><form action={setBlockAssetAction.bind(null, route.experienceId, route.versionId, route.sectionId, block.id)} className="builder-inspector-form"><input type="hidden" name="asset_operation" value="select"/><AssetSelect assets={availableAssets} autoFocus={false}/><button type="submit" disabled={!availableAssets.length}>{asset ? "Replace with selected" : "Choose existing"}</button></form><form action={setBlockAssetAction.bind(null, route.experienceId, route.versionId, route.sectionId, block.id)} className="builder-inspector-form"><input type="hidden" name="asset_operation" value="upload"/><label>Upload file<input name="file" type="file" accept={block.block_type === "image" ? "image/jpeg,image/png,image/webp,image/gif" : block.block_type === "pdf_reader" ? "application/pdf,.pdf" : ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.rtf,.txt,.csv"} required/></label><label>Library title<input name="asset_title" maxLength={200}/></label><button type="submit">{asset ? "Upload replacement" : "Upload file"}</button></form>{asset && <form action={setBlockAssetAction.bind(null, route.experienceId, route.versionId, route.sectionId, block.id)}><input type="hidden" name="asset_operation" value="remove"/><button type="submit">Remove attachment</button></form>}</div></details>}
      {definition && definition.category !== "custom_assessment" && <details className="builder-block-editor" open={selected || (!inline && ((definition.supportsResponse && responseDefinition?.label === definition.label) || (nativeAsset && !asset)))}><summary>Edit {definition.supportsResponse ? "question" : directInline ? "settings" : "content"}</summary><form action={(directInline ? updateBlockSettingsAction : updateBlockAction).bind(null, route.experienceId, route.versionId, route.sectionId, block.id)} className="admin-form builder-block-form">{!directInline && <EditorFields block={block} responseDefinition={responseDefinition}/>}<label>Required or optional<select name="requirement_level" defaultValue={block.requirement_level}><option value="required">Required</option><option value="recommended">Recommended</option><option value="optional">Optional</option></select></label><label>Visibility<select name="visibility" defaultValue={block.visibility}><option value="visible">Visible</option><option value="hidden">Hidden</option></select></label><button className="admin-primary" type="submit">Save changes</button></form></details>}
      <div className="builder-block-footer"><div>{definition?.duplicable && <form action={duplicateBlockAction.bind(null, route.experienceId, route.versionId, route.sectionId, block.id)}><button type="submit">Duplicate</button></form>}{targetColumns.length > 0 && <details className="builder-block-move"><summary>Move…</summary><form action={moveBlockAction.bind(null, route.experienceId, route.versionId, route.sectionId, block.id)}><label>Move to<select name="target_column_id" defaultValue={targetColumns[0].id}>{targetColumns.map((column) => <option key={column.id} value={column.id}>{column.label || humanize(column.column_key)}</option>)}</select></label><button type="submit">Move</button></form></details>}</div><details className="builder-block-delete"><summary>Delete</summary><form action={deleteBlockAction.bind(null, route.experienceId, route.versionId, route.sectionId, block.id)}><label><input name="confirm" type="checkbox" required/> Confirm permanent deletion</label><button type="submit">Delete Block</button></form></details></div>
    </div>}
  </article>;
  const positionControls = <div className="course-builder-position-controls" aria-label={`${definition?.label ?? block.block_type} position`}><form action={reorderBlockAction.bind(null, route.experienceId, route.versionId, route.sectionId, block.id, "up")}><button type="submit" disabled={index === 0} aria-label={`Move ${definition?.label ?? block.block_type} up`} title="Move up">↑</button></form><form action={reorderBlockAction.bind(null, route.experienceId, route.versionId, route.sectionId, block.id, "down")}><button type="submit" disabled={index === siblings.length - 1} aria-label={`Move ${definition?.label ?? block.block_type} down`} title="Move down">↓</button></form></div>;
  return editable ? <CurriculumDragItem action={dragBlockAction.bind(null, route.experienceId, route.versionId, route.sectionId)} id={block.id} kind="block" parentId={block.column_id!} index={index} label={definition?.label ?? block.block_type} className="builder-block-drag-wrapper" positionControls={positionControls}>{card}</CurriculumDragItem> : card;
}

export async function BuilderColumnBlocks({ column, columns, blocks, route, editable, selectedBlockId }: { column: Column; columns: Column[]; blocks: Block[]; route: Route; editable: boolean; selectedBlockId?: string }) {
  const columnBlocks = blocks.filter((block) => block.column_id === column.id);
  const responseResult = columnBlocks.length ? await createAdminSupabaseClient().from("response_definitions").select("*").in("block_id", columnBlocks.map((block) => block.id)) : { data: [], error: null };
  const responseDefinitions = responseResult.data ?? [];
  const assets = await resolveCourseAssets(createAdminSupabaseClient(), columnBlocks.map((block) => block.id), []);
  const assetKinds = new Set(columnBlocks.map((block) => block.block_type));
  const [imageAssets, pdfAssets, documentAssets] = await Promise.all([
    assetKinds.has("image") ? listCourseAssets(createAdminSupabaseClient(), "image") : Promise.resolve([]),
    assetKinds.has("pdf_reader") ? listCourseAssets(createAdminSupabaseClient(), "pdf") : Promise.resolve([]),
    assetKinds.has("document") || assetKinds.has("download") ? listCourseAssets(createAdminSupabaseClient(), "document") : Promise.resolve([]),
  ]);
  const availableAssets = (block: Block) => block.block_type === "image" ? imageAssets : block.block_type === "pdf_reader" ? pdfAssets : documentAssets;
  return <div className="builder-column-blocks">
    <div className="builder-block-list">{columnBlocks.map((block, index) => <Fragment key={block.id}>{editable && <BlockLibrary route={route} columnId={column.id} position={index}/>}<BlockCard block={block} blocks={blocks} columns={columns} responseDefinition={responseDefinitions.find((item) => item.block_id === block.id)} asset={assets.blocks[block.id]} availableAssets={availableAssets(block)} route={route} editable={editable} selected={block.id === selectedBlockId}/></Fragment>)}{columnBlocks.length === 0 && <p className="builder-block-empty">No Content yet. Add the first item to this column.</p>}</div>
    {editable && <BlockLibrary route={route} columnId={column.id}/>}
  </div>;
}

export async function BuilderBlockInspector({ block, route, editable }: { block: Block; route: Route; editable: boolean }) {
  const definition = getBlockDefinition(block.block_type);
  const response = definition?.supportsResponse ? await createAdminSupabaseClient().from("response_definitions").select("*").eq("block_id", block.id).maybeSingle() : null;
  if (!definition) return <div className="course-builder-inspector-content"><strong>Unavailable content</strong><p>This stored item requires its registered editor.</p></div>;
  const inline = definition.editorKey === "heading" || definition.editorKey === "rich_text" || definition.editorKey === "callout";
  const directInline = definition.editorKey === "heading" || definition.editorKey === "rich_text";
  const native = ["image", "pdf_reader", "document", "download"].includes(block.block_type);
  const assets = native ? await listCourseAssets(createAdminSupabaseClient(), block.block_type === "image" ? "image" : block.block_type === "pdf_reader" ? "pdf" : "document") : [];
  const currentAsset = native ? (await resolveCourseAssets(createAdminSupabaseClient(), [block.id], [])).blocks[block.id] : undefined;
  const uploadLabel = block.block_type === "image" ? "Upload Image" : block.block_type === "pdf_reader" ? "Upload PDF" : "Upload File";
  const empty = emptyAssetCopy(block.block_type);
  const uploadAccept = block.block_type === "image" ? "image/jpeg,image/png,image/webp,image/gif" : block.block_type === "pdf_reader" ? "application/pdf,.pdf" : ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.rtf,.txt,.csv";
  const config = configuration(block);
  return <div className="course-builder-inspector-content"><span>{definition.label}</span><strong>{response?.data?.label || value(config, "title") || definition.label}</strong><p>{directInline ? "Edit the visible content directly in the lesson. Advanced settings remain here." : inline ? "Click the content in the lesson to edit its words." : "Edit this item while keeping the lesson visible."}</p>{editable && native && <details open><summary>{currentAsset ? "Replace or Remove" : empty.title}</summary>{!currentAsset && <p>{empty.description}</p>}<form action={setBlockAssetAction.bind(null, route.experienceId, route.versionId, route.sectionId, block.id)} className="builder-inspector-form"><input type="hidden" name="asset_operation" value="select"/><AssetSelect assets={assets} autoFocus={!currentAsset}/><button type="submit" disabled={!assets.length}>{currentAsset ? "Replace with Selected" : "Choose Existing"}</button></form><form action={setBlockAssetAction.bind(null, route.experienceId, route.versionId, route.sectionId, block.id)} className="builder-inspector-form"><input type="hidden" name="asset_operation" value="upload"/><label>{uploadLabel}<input name="file" type="file" accept={uploadAccept} required/></label><label>Library title<input name="asset_title" maxLength={200}/></label><button type="submit">{currentAsset ? "Upload Replacement" : uploadLabel}</button></form>{currentAsset && <form action={setBlockAssetAction.bind(null, route.experienceId, route.versionId, route.sectionId, block.id)}><input type="hidden" name="asset_operation" value="remove"/><button type="submit">Remove</button></form>}</details>}{editable && <form action={(directInline ? updateBlockSettingsAction : updateBlockAction).bind(null, route.experienceId, route.versionId, route.sectionId, block.id)} className="builder-inspector-form">{!directInline && <details open={!inline}><summary>{inline ? "Content and presentation" : "Content details"}</summary><EditorFields block={block} responseDefinition={response?.data ?? undefined}/></details>}{block.block_type === "heading" && <><label>Alignment<select name="alignment" defaultValue={value(config, "alignment") || "left"}><option value="left">Left</option><option value="center">Center</option></select></label><label>Eyebrow<input name="eyebrow" defaultValue={value(config, "eyebrow")} maxLength={120}/></label></>}<label>Requirement<select name="requirement_level" defaultValue={block.requirement_level}><option value="required">Required</option><option value="recommended">Recommended</option><option value="optional">Optional</option></select></label><label>Visibility<select name="visibility" defaultValue={block.visibility}><option value="visible">Visible</option><option value="hidden">Hidden</option></select></label><button type="submit">Save advanced settings</button></form>}</div>;
}
