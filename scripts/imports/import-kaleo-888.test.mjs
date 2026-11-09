import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { buildDraftPackage, kaleoCourseConfiguration, buildProposal, loadExport, normalizeTopicTitle, tutorVideo, unsupportedEmbeds } from "./import-kaleo-888.mjs";

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


test("green, black and white course palette has accessible text contrast", () => {
  const configuration = kaleoCourseConfiguration();
  assert.equal(configuration.companion_mode, "group");
  assert.equal(configuration.appearance.colors.primaryAccent, "#008037");
  assert.equal(configuration.appearance.colors.completion, "#008037");
  const luminance = (hex) => {
    const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  for (const [foreground, background] of [["#ffffff", "#008037"], ["#111111", "#ffffff"], ["#526158", "#f3f8f4"], ["#008037", "#f3f8f4"]]) {
    const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    assert.ok((light + 0.05) / (dark + 0.05) >= 4.5, `${foreground} on ${background} must meet AA text contrast`);
  }
});

test("offline draft stays private and preserves the complete curriculum", () => {
  const draft = buildDraftPackage(envelope, course);
  assert.equal(draft.target.status, "draft");
  assert.equal(draft.target.visibility, "private");
  assert.equal(draft.target.publishedAt, null);
  assert.equal(draft.target.admissionPolicy, "admin_assigned");
  assert.deepEqual(draft.counts, proposal.counts);
  assert.throws(() => buildDraftPackage({ ...envelope, keep_user_data: true }, course), /content-only/);
});

test("offline command works with database credentials removed", () => {
  const env = { ...process.env };
  delete env.NEXT_PUBLIC_SUPABASE_URL;
  delete env.SUPABASE_SECRET_KEY;
  const output = execFileSync(process.execPath, ["scripts/imports/import-kaleo-888.mjs", `--source=${source}`, "--offline"], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert.equal(JSON.parse(output).mode, "offline-draft");
});
