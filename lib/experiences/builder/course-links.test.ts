import assert from "node:assert/strict";
import test from "node:test";
import { contextualCourseLink, safeRichTextLink } from "./course-links.ts";
const href = "/experiences/hub-leader-cohort/course/week-1/lesson-2/reflection";
test("internal links retain cohort context and draft preview routing", () => {
  assert.equal(contextualCourseLink(href, { slug: "hub-leader-cohort", cohortId: "cohort-a" }), `${href}?cohort=cohort-a`);
  assert.equal(contextualCourseLink(href, { slug: "hub-leader-cohort", previewBase: "/admin/trainings/course/versions/draft/preview" }), "/admin/trainings/course/versions/draft/preview/week-1/lesson-2/reflection");
  assert.equal(contextualCourseLink(href, { slug: "another-course", cohortId: "cohort-a" }), href);
});
test("links permit selected course pages and HTTPS while rejecting unsafe destinations", () => {
  assert.equal(safeRichTextLink(href), href);
  assert.equal(safeRichTextLink("https://example.org/resource"), "https://example.org/resource");
  for (const unsafe of ["javascript:alert(1)", "//example.org", "/admin/users", "/experiences/course/course/a/b/../secret", "https://user:pass@example.org"]) assert.equal(safeRichTextLink(unsafe), null);
});
