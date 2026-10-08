import assert from "node:assert/strict";
import { test } from "node:test";
import { ASSESSMENT_CLOSE_MESSAGE, returnFromAssessment } from "./assessment-return.ts";

test("course popup requests closure without navigating inside its iframe", () => {
  const messages: unknown[] = [];
  const navigations: string[] = [];
  Object.assign(globalThis, {
    window: { self: {}, top: {}, parent: { postMessage: (...args: unknown[]) => messages.push(args) }, location: { origin: "https://example.org", assign: (url: string) => navigations.push(url) } },
    document: { documentElement: { classList: { contains: () => true } } },
  });
  returnFromAssessment("/experiences/course/week/lesson");
  assert.deepEqual(messages, [[{ type: ASSESSMENT_CLOSE_MESSAGE }, "https://example.org"]]);
  assert.deepEqual(navigations, []);
});

test("standalone assessment follows its dashboard destination", () => {
  const context = {};
  const navigations: string[] = [];
  Object.assign(globalThis, { window: { self: context, top: context, location: { assign: (url: string) => navigations.push(url) } } });
  returnFromAssessment("/dashboard");
  assert.deepEqual(navigations, ["/dashboard"]);
});
