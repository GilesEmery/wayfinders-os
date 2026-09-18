import assert from "node:assert/strict";
import test from "node:test";
import { curriculumContext, curriculumLocationKey, curriculumLocationLabel, validMeetingUrl, videoConferenceEnabled } from "./companion-live.ts";

const weekOne = { module_key: "week-1", module_title: "Week 1", lesson_key: "listen", lesson_title: "Listening Well", section_key: "welcome", section_title: "Welcome" };

test("legacy empty Chat context remains displayable without a location header", () => {
  assert.deepEqual(curriculumContext({}), {}); assert.equal(curriculumLocationKey({}), null); assert.deepEqual(curriculumLocationLabel({}), { primary: "", secondary: "" });
});

test("Chat location uses stable hierarchy keys and historical title snapshots", () => {
  assert.equal(curriculumLocationKey(weekOne), "key:week-1/listen/welcome"); assert.deepEqual(curriculumLocationLabel(weekOne), { primary: "Week 1 · Listening Well", secondary: "Welcome" });
});

test("consecutive messages only add a header when location identity changes", () => {
  const contexts = [weekOne, { ...weekOne, section_title: "Renamed snapshot" }, { ...weekOne, section_key: "practice", section_title: "Practice" }, {}];
  const keys = contexts.map(curriculumLocationKey); assert.deepEqual(keys.map((key, index) => Boolean(key && key !== (index ? keys[index - 1] : null))), [true, false, true, false]);
});

test("Video Conference requires explicit Cohort enablement and a safe URL", () => {
  assert.equal(videoConferenceEnabled({ enabled: "false", url: "https://meet.example/a" }), false); assert.equal(videoConferenceEnabled({ enabled: "true", url: "" }), false); assert.equal(videoConferenceEnabled({ enabled: "true", url: "https://meet.example/a" }), true); assert.equal(validMeetingUrl("javascript:alert(1)"), false);
});

test("different Cohort override configurations remain independent", () => {
  const tuesday = { enabled: "true", url: "https://meet.example/tuesday" }; const thursday = { enabled: "true", url: "https://meet.example/thursday" }; assert.notEqual(tuesday.url, thursday.url); assert.equal(videoConferenceEnabled(tuesday), true); assert.equal(videoConferenceEnabled(thursday), true);
});
