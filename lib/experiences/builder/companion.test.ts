import assert from "node:assert/strict";
import test from "node:test";
import { COMPANION_LIBRARY, COMPANION_TYPES, companionCreatorGroups, companionModuleAvailable } from "./companion.ts";
import { resolveCourseTemplate } from "./course-templates.ts";

const modules = [
  { id: "notes", availability_context: "individual" as const, audience: "personal" },
  { id: "resources", availability_context: "both" as const, audience: "personal" },
  { id: "chat", availability_context: "cohort" as const, audience: "group" },
  { id: "video", availability_context: "cohort" as const, audience: "group" },
];

const visible = (hasCohortContext: boolean) => modules
  .filter((module) => companionModuleAvailable(module, hasCohortContext, "participant"))
  .map((module) => module.id);

test("personal Course context shows Individual and Both but not Cohort", () => {
  assert.deepEqual(visible(false), ["notes", "resources"]);
});

test("valid Cohort context also shows Cohort modules", () => {
  assert.deepEqual(visible(true), ["notes", "resources", "chat", "video"]);
});

test("Individual modules remain the same definition in every context", () => {
  const personal = modules.filter((module) => companionModuleAvailable(module, false, "participant"));
  const tuesday = modules.filter((module) => companionModuleAvailable(module, true, "participant"));
  const thursday = modules.filter((module) => companionModuleAvailable(module, true, "participant"));
  assert.equal(personal.find((module) => module.id === "notes"), tuesday.find((module) => module.id === "notes"));
  assert.equal(tuesday.find((module) => module.id === "notes"), thursday.find((module) => module.id === "notes"));
});

test("Both reuses one module definition instead of duplicating it", () => {
  const resource = modules.find((module) => module.id === "resources");
  assert.equal(modules.filter((module) => module.id === "resources").length, 1);
  assert.equal(companionModuleAvailable(resource!, false, "participant"), true);
  assert.equal(companionModuleAvailable(resource!, true, "participant"), true);
});

test("invalid or missing Cohort context cannot expose Chat or Video Call", () => {
  assert.equal(companionModuleAvailable(modules[2], false, "participant"), false);
  assert.equal(companionModuleAvailable(modules[3], false, "participant"), false);
});

test("leader audience is a role check separate from Cohort availability", () => {
  const leaderModule = { availability_context: "cohort" as const, audience: "leaders" };
  assert.equal(companionModuleAvailable(leaderModule, true, "participant"), false);
  assert.equal(companionModuleAvailable(leaderModule, true, "facilitator"), true);
  assert.equal(companionModuleAvailable(leaderModule, false, "facilitator"), false);
});

test("Admin personal Preview bypasses audience but not availability", () => {
  assert.equal(companionModuleAvailable({ availability_context: "both", audience: "leaders" }, false, null, true), true);
  assert.equal(companionModuleAvailable({ availability_context: "cohort", audience: "group" }, false, null, true), false);
});

test("Standard Course shell never includes Companion", () => {
  assert.equal(resolveCourseTemplate("builder", "standard").shell.includes("group_companion"), false);
  assert.equal(resolveCourseTemplate("builder", "enhanced").shell.includes("group_companion"), true);
});

test("module registry supplies the approved defaults", () => {
  assert.equal(COMPANION_LIBRARY.personal_notes.defaultAvailability, "individual");
  assert.equal(COMPANION_LIBRARY.personal_notes.defaultScope, "course");
  assert.equal(COMPANION_LIBRARY.personal_notes.singleInstance, true);
  assert.equal(COMPANION_LIBRARY.reflection_prompt.defaultScope, "module");
  assert.equal(COMPANION_LIBRARY.reflection_prompt.defaultAvailability, "individual");
  assert.equal(COMPANION_LIBRARY.action_steps.defaultAvailability, "individual");
  assert.equal(COMPANION_LIBRARY.resources.defaultAvailability, "both");
  assert.equal(COMPANION_LIBRARY.custom_text.defaultAvailability, "both");
  assert.equal(COMPANION_LIBRARY.custom_link.defaultAvailability, "both");
  for (const type of ["chat", "video_call", "group_members", "next_gathering", "facilitator", "prayer", "announcements", "shared_resources"] as const) {
    assert.equal(COMPANION_LIBRARY[type].defaultAvailability, "cohort");
  }
});

test("privacy-sensitive and live module restrictions reject unsafe contexts", () => {
  assert.deepEqual(COMPANION_LIBRARY.personal_notes.availabilities, ["individual"]);
  assert.deepEqual(COMPANION_LIBRARY.chat.availabilities, ["cohort"]);
  assert.deepEqual(COMPANION_LIBRARY.video_call.availabilities, ["cohort"]);
  assert.deepEqual(COMPANION_LIBRARY.group_members.availabilities, ["cohort"]);
});

test("creator chooser groups Personal + Cohort separately from Cohort Only", () => {
  const groups = companionCreatorGroups();
  assert.deepEqual(groups.map((group) => group.label), ["Personal + Cohort", "Cohort Only"]);
  assert.deepEqual(groups[0].items.map((item) => item.type), ["personal_notes", "resources", "action_steps", "reflection_prompt", "custom_text", "custom_link"]);
  assert.deepEqual(groups[1].items.map((item) => item.type), ["facilitator", "next_gathering", "chat", "video_call", "group_members", "prayer", "announcements", "shared_resources", "group_discussion_prompt", "group_notes"]);
});

test("creator chooser marks existing items without mutating registry order", () => {
  const originalOrder = [...COMPANION_TYPES];
  const groups = companionCreatorGroups(["personal_notes", "chat"]);
  const items = groups.flatMap((group) => group.items);
  assert.equal(items.find((item) => item.type === "personal_notes")?.added, true);
  assert.equal(items.find((item) => item.type === "personal_notes")?.disabled, true);
  assert.equal(items.find((item) => item.type === "chat")?.added, true);
  assert.equal(items.find((item) => item.type === "chat")?.disabled, true);
  assert.equal(items.find((item) => item.type === "resources")?.added, false);
  assert.equal(items.find((item) => item.type === "resources")?.disabled, false);
  assert.deepEqual(COMPANION_TYPES, originalOrder);
});

test("creator chooser uses Cohort terminology", () => {
  const labels = companionCreatorGroups().flatMap((group) => group.items.map((item) => item.definition.creatorLabel ?? item.definition.label));
  assert.ok(labels.includes("Cohort Members"));
  assert.ok(labels.includes("Cohort Notes"));
  assert.equal(labels.includes("Group Members"), false);
});
