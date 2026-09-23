import assert from "node:assert/strict";
import test from "node:test";
import { buildProposal, loadExport, normalizeTopicTitle, tutorVideo, unsupportedEmbeds } from "./import-kaleo-888.mjs";

const source = process.env.KALEO_888_SOURCE;
if (!source) throw new Error("Set KALEO_888_SOURCE to the TutorLMS 888 ZIP.");
const { envelope, course } = loadExport(source);
const proposal = buildProposal(course);

test("source parses as content-only TutorLMS course 888", () => { assert.equal(Number(course.ID),888); assert.equal(envelope.keep_user_data,false); });
test("34 topics and 150 lessons preserve source order", () => { assert.equal(proposal.modules.length,34); assert.equal(proposal.counts.lessons,150); assert.deepEqual(proposal.modules.map(m=>m.sourceId),course.contents.map(t=>Number(t.ID))); });
test("asterisk week titles normalize without changing provenance", () => { assert.equal(normalizeTopicTitle("*Week 1"),"Week 1"); assert.equal(proposal.modules.find(m=>m.sourceTitle==="*Week 1").title,"Week 1"); });
test("every source lesson maps to one editable Lesson and Page", () => { assert.equal(proposal.counts.lessons,proposal.counts.sections); assert.equal(proposal.counts.sections,150); });
test("video metadata is extracted", () => { const videos=course.contents.flatMap(t=>t.children).map(tutorVideo).filter(Boolean); assert.equal(videos.length,59); assert.ok(videos.every(url=>/^https?:\/\//.test(url))); });
test("resources are unique by source URL", () => { assert.equal(new Set(proposal.resources.map(r=>r.url)).size,proposal.resources.length); });
test("unsupported embeds and Jotform are flagged", () => { const survey=course.contents.flatMap(t=>t.children).find(i=>/Kaleo Network Survey/.test(i.post_title)); assert.equal(unsupportedEmbeds(survey).jotform,true); assert.ok(proposal.unsupported.some(i=>i.sourceId===Number(survey.ID))); });
test("proposal is draft-only and contains no participant records", () => { assert.equal("participants" in proposal,false); assert.equal("enrollments" in proposal,false); });
