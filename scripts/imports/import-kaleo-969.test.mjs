import assert from "node:assert/strict";
import test from "node:test";

process.argv.push("--course=969");
const { buildProposal, loadExport, normalizeTopicTitle, tutorVideo, unsupportedEmbeds } = await import("./import-kaleo-888.mjs");

const source = process.env.KALEO_969_SOURCE;
if (!source) throw new Error("Set KALEO_969_SOURCE to the TutorLMS 969 ZIP.");
const { envelope, course } = loadExport(source);
const proposal = buildProposal(course);
const sourceLessons = course.contents.flatMap((topic) => topic.children);

test("source parses as content-only TutorLMS course 969", () => { assert.equal(Number(course.ID), 969); assert.equal(envelope.keep_user_data, false); });
test("34 topics and 185 lessons preserve source order", () => { assert.equal(proposal.modules.length, 34); assert.equal(proposal.counts.lessons, 185); assert.deepEqual(proposal.modules.map((module) => module.sourceId), course.contents.map((topic) => Number(topic.ID))); });
test("asterisk week titles normalize without changing provenance", () => { assert.equal(normalizeTopicTitle("*Week 30"), "Week 30"); assert.equal(proposal.modules.find((module) => module.sourceTitle === "*Week 30").title, "Week 30"); });
test("every source lesson maps to one editable Lesson and Page", () => { assert.equal(proposal.counts.lessons, proposal.counts.sections); assert.equal(proposal.counts.sections, 185); });
test("all 59 video records use supported source URLs", () => { const videos = sourceLessons.map(tutorVideo).filter(Boolean); assert.equal(videos.length, 59); assert.ok(videos.every((url) => /^https?:\/\//.test(url))); });
test("114 attachment references are mapped and deduplicated", () => { const attachments = sourceLessons.flatMap((lesson) => lesson.attachment_links ?? []); assert.equal(attachments.length, 114); assert.equal(new Set(proposal.resources.map((resource) => resource.url)).size, proposal.resources.length); });
test("required Jotform survey is preserved and flagged", () => { const survey = sourceLessons.find((item) => item.post_title === "Kaleo Network Survey (Required)"); assert.equal(unsupportedEmbeds(survey).jotform, true); assert.ok(proposal.unsupported.some((item) => item.sourceId === Number(survey.ID) && item.required)); });
test("proposal contains no participant or publication records", () => { assert.equal("participants" in proposal, false); assert.equal("enrollments" in proposal, false); assert.equal("published" in proposal, false); });
