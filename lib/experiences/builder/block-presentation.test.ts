import test from "node:test";
import assert from "node:assert/strict";
import { presentationSettings, readBlockPresentation, responsePresentationSettings } from "./block-presentation.ts";

test("legacy items and unrelated edits retain existing settings", () => {
  assert.equal(readBlockPresentation({}), null);
  const settings = { unrelated: { enabled: true } };
  assert.deepEqual(presentationSettings(settings, new FormData()), settings);
});

test("header and body sizes are independent and blank headers remain blank", () => {
  const form = new FormData();
  form.set("presentation_header", "");
  form.set("presentation_body", "**Important**\n\n- First\n  - Nested");
  form.set("presentation_header_size", "h4");
  form.set("presentation_body_size", "h1");
  form.set("presentation_placement", "between");
  const settings = presentationSettings({ keep: true }, form);
  assert.equal(settings.keep, true);
  assert.deepEqual(readBlockPresentation(settings), { header: "", body: form.get("presentation_body"), headerSize: "h4", bodySize: "h1", placement: "between" });
  assert.deepEqual(readBlockPresentation(JSON.parse(JSON.stringify(settings))), readBlockPresentation(settings));
});

test("invalid sizes normalize safely and oversized text cannot be saved", () => {
  assert.deepEqual(readBlockPresentation({ textPresentation: { headerSize: "giant", bodySize: null, placement: "unsafe" } }), { header: "", body: "", headerSize: "h3", bodySize: "h4", placement: "below" });
  const form = new FormData();
  form.set("presentation_header", "x".repeat(12001));
  assert.throws(() => presentationSettings({}, form), /12,000/);
});


test("question edits replace untouched display seeds without overwriting rich text edits", () => {
  const form = new FormData();
  form.set("prompt", "What boundaries does Jesus cross?");
  form.set("instructions", "Consider the social and spiritual boundaries.");
  form.set("presentation_header", "Short Response");
  form.set("presentation_header_initial", "Short Response");
  form.set("presentation_body", "");
  form.set("presentation_body_initial", "");
  const updated = readBlockPresentation(presentationSettings({}, form));
  assert.equal(updated?.header, form.get("prompt"));
  assert.equal(updated?.body, form.get("instructions"));
  form.set("presentation_header", "**Custom header**");
  assert.equal(readBlockPresentation(presentationSettings({}, form))?.header, "**Custom header**");
});

test("existing generic display headers recover the saved question and instructions", () => {
  const settings = { textPresentation: { header: "Short Response", body: "" } };
  const recovered = readBlockPresentation(responsePresentationSettings(settings, "Saved question", "Saved instructions"));
  assert.equal(recovered?.header, "Saved question");
  assert.equal(recovered?.body, "Saved instructions");
  const blank = { textPresentation: { header: "", body: "" } };
  const visibleQuestion = readBlockPresentation(responsePresentationSettings(blank, "Saved question"));
  assert.equal(visibleQuestion?.header, "Saved question");
  assert.equal(visibleQuestion?.body, "");
  assert.deepEqual(blank, { textPresentation: { header: "", body: "" } });
});


test("advanced presentation saves additional text and bounded appearance while preserving unrelated settings",()=>{
 const form=new FormData();form.set("presentation_header","Title");form.set("presentation_body","**Supporting text**");form.set("presentation_subtitle","Subtitle");form.set("presentation_caption","Caption");form.set("presentation_appearance","yes");form.set("presentation_padding","24");form.set("presentation_width","75");form.set("presentation_alignment","center");form.set("presentation_background","#123456");form.set("presentation_border","yes");
 const settings=presentationSettings({opaque:{keep:true}},form);assert.deepEqual(settings.opaque,{keep:true});const p=readBlockPresentation(settings)!;assert.equal(p.subtitle,"Subtitle");assert.equal(p.caption,"Caption");assert.deepEqual(p.appearance,{padding:24,width:75,alignment:"center",background:"#123456",border:true});
 form.set("presentation_width","101");assert.throws(()=>presentationSettings({},form),/Invalid presentation dimensions/);
});
test("advanced presentation rejects unsafe CSS and legacy saves preserve additional text",()=>{
 const settings={textPresentation:{header:"Title",body:"Text",subtitle:"Keep",caption:"Also keep",appearance:{background:"url(https://evil.test)",padding:-1,width:1000,alignment:"absolute"}}};
 assert.equal(readBlockPresentation(settings)?.appearance,undefined);const form=new FormData();form.set("presentation_header","Updated");form.set("presentation_body","Body");assert.equal(readBlockPresentation(presentationSettings(settings,form))?.subtitle,"Keep");
});

test("image fit accepts only contain/cover and preserves unspecified legacy sizing",()=>{const read=(fit:unknown)=>readBlockPresentation({textPresentation:{header:"",body:"",appearance:{fit}}});assert.equal(read("cover")?.appearance?.fit,"cover");assert.equal(read("contain")?.appearance?.fit,"contain");assert.equal(read("url(evil)")?.appearance,undefined);});

test("appearance-only edits never create an overriding text presentation",()=>{const form=new FormData();form.set("presentation_appearance","yes");form.set("presentation_padding","18");const original={opaque:{keep:true},blockAppearance:{width:80}};const next=presentationSettings(original,form);assert.equal(readBlockPresentation(next),null);assert.deepEqual(next.opaque,original.opaque);assert.equal((next.blockAppearance as {padding:number}).padding,18);});

test("typography overrides validate bounds and preserve source text",()=>{const form=new FormData();form.set("presentation_appearance","yes");form.set("presentation_fontSize","24");form.set("presentation_lineHeight","1.6");form.set("presentation_letterSpacing","0.5");form.set("presentation_color","#123456");form.set("presentation_family","editorial");const saved=presentationSettings({keep:true},form);assert.equal(readBlockPresentation(saved),null);assert.equal(saved.keep,true);assert.deepEqual(saved.blockAppearance,{fontSize:24,lineHeight:1.6,letterSpacing:0.5,color:"#123456",family:"editorial",border:false});form.set("presentation_fontSize","999");assert.throws(()=>presentationSettings({},form),/Invalid typography/);});

test("text columns are opt-in, bounded and preserve existing source settings",()=>{const form=new FormData();form.set("presentation_appearance","yes");form.set("presentation_columns","3");form.set("presentation_columnGap","32");const next=presentationSettings({keep:true},form);assert.deepEqual(next.blockAppearance,{columns:3,columnGap:32,border:false});assert.equal(next.keep,true);assert.equal(readBlockPresentation(next),null);form.set("presentation_columns","4");assert.throws(()=>presentationSettings({},form),/text columns/);form.set("presentation_columns","2");form.set("presentation_columnGap","-1");assert.throws(()=>presentationSettings({},form),/Column gap/);});

test("video placement preserves text and accepts only stacked/left/right",()=>{const form=new FormData();form.set("presentation_header","Header");form.set("presentation_body","**Beside video**");form.set("presentation_media_side","right");const next=presentationSettings({keep:true},form);assert.equal(readBlockPresentation(next)?.mediaSide,"right");assert.equal(readBlockPresentation(next)?.body,"**Beside video**");assert.equal(next.keep,true);form.set("presentation_media_side","invalid");assert.throws(()=>presentationSettings({},form),/video/);});

test("video canvas title updates an untouched advanced header while custom formatting is preserved",()=>{const form=new FormData();form.set("video_canvas","yes");form.set("title","New title");form.set("presentation_header","Old title");form.set("presentation_header_initial","Old title");form.set("presentation_body","Keep text");assert.equal(readBlockPresentation(presentationSettings({},form))?.header,"New title");form.set("presentation_header","**Custom header**");assert.equal(readBlockPresentation(presentationSettings({},form))?.header,"**Custom header**");});
