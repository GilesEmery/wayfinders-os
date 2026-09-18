import assert from "node:assert/strict";
import test from "node:test";
import type { Tables } from "@/lib/supabase/database.types";
import { actualUsageCount, filterResources, isResourceSelectable, normalizeExperienceIds, normalizedFileType, resourceCourseIds, validateResourceCategory, type FilterableResource } from "./resource-library-policy.ts";

function resource(overrides: Partial<FilterableResource> & Pick<Tables<"resources">, "id" | "title">): FilterableResource {
  return {
    id: overrides.id,
    title: overrides.title,
    description: overrides.description ?? null,
    resource_type: overrides.resource_type ?? "download",
    resource_category: overrides.resource_category ?? "other",
    status: overrides.status ?? "active",
    external_url: overrides.external_url ?? null,
    storage_bucket: overrides.storage_bucket ?? "purposeos-assets",
    storage_path: overrides.storage_path ?? `library/${overrides.id}/asset`,
    original_filename: overrides.original_filename ?? null,
    mime_type: overrides.mime_type ?? null,
    file_size_bytes: overrides.file_size_bytes ?? null,
    metadata: overrides.metadata ?? {},
    created_by: overrides.created_by ?? null,
    created_at: overrides.created_at ?? "2026-09-18T12:00:00.000Z",
    updated_at: overrides.updated_at ?? "2026-09-18T12:00:00.000Z",
    usages: overrides.usages ?? [],
    associatedExperienceIds: overrides.associatedExperienceIds ?? [],
    courseIds: overrides.courseIds ?? [],
  };
}

const rows = [
  resource({ id: "a", title: "Zeta Guide", original_filename: "leader-handbook.docx", resource_category: "guide", created_at: "2026-09-17T12:00:00.000Z" }),
  resource({ id: "b", title: "Alpha Worksheet", description: "Reflection exercise", original_filename: "reflection.pdf", resource_type: "pdf", mime_type: "application/pdf", resource_category: "worksheet", created_at: "2026-09-18T12:00:00.000Z", courseIds: ["course-1"] }),
  resource({ id: "c", title: "Old Logo", resource_type: "image", mime_type: "image/png", resource_category: "logo", status: "archived", created_at: "2026-09-16T12:00:00.000Z" }),
];

test("sorts newest, oldest, A-Z, and Z-A", () => {
  assert.deepEqual(filterResources(rows, {}).map(({ id }) => id), ["b", "a"]);
  assert.deepEqual(filterResources(rows, { sort: "oldest" }).map(({ id }) => id), ["a", "b"]);
  assert.deepEqual(filterResources(rows, { sort: "az" }).map(({ id }) => id), ["b", "a"]);
  assert.deepEqual(filterResources(rows, { sort: "za" }).map(({ id }) => id), ["a", "b"]);
});

test("searches display title, original filename, and description", () => {
  assert.deepEqual(filterResources(rows, { q: "alpha" }).map(({ id }) => id), ["b"]);
  assert.deepEqual(filterResources(rows, { q: "handbook" }).map(({ id }) => id), ["a"]);
  assert.deepEqual(filterResources(rows, { q: "exercise" }).map(({ id }) => id), ["b"]);
});

test("filters by category, normalized type, Course, and lifecycle status", () => {
  assert.deepEqual(filterResources(rows, { category: "guide" }).map(({ id }) => id), ["a"]);
  assert.deepEqual(filterResources(rows, { type: "pdf" }).map(({ id }) => id), ["b"]);
  assert.deepEqual(filterResources(rows, { experience: "course-1" }).map(({ id }) => id), ["b"]);
  assert.deepEqual(filterResources(rows, { status: "archived" }).map(({ id }) => id), ["c"]);
  assert.equal(filterResources(rows, {}).some(({ id }) => id === "c"), false);
});

test("normalizes files without exposing private storage URLs", () => {
  assert.equal(normalizedFileType(rows[0]), "document");
  assert.equal(normalizedFileType(rows[1]), "pdf");
  assert.equal(normalizedFileType(rows[2]), "image");
  assert.equal("signed_url" in rows[0], false);
});

test("combines actual and associated Courses without duplicate counts", () => {
  const usages = [{ experienceId: "course-1" }, { experienceId: "course-1" }, { experienceId: "course-2" }, { experienceId: null }];
  assert.deepEqual(resourceCourseIds(usages, ["course-1", "course-3"]), ["course-1", "course-2", "course-3"]);
  assert.equal(actualUsageCount(usages), 4);
  assert.equal(actualUsageCount([]), 0);
});

test("Course filtering accepts actual usage or association without duplication", () => {
  const actual = resource({ id: "actual", title: "Actual", courseIds: resourceCourseIds([{ experienceId: "course-1" }], []) });
  const associated = resource({ id: "associated", title: "Associated", courseIds: resourceCourseIds([], ["course-1"]) });
  const both = resource({ id: "both", title: "Both", courseIds: resourceCourseIds([{ experienceId: "course-1" }], ["course-1"]) });
  assert.deepEqual(filterResources([actual, associated, both], { experience: "course-1" }).map(({ id }) => id), ["actual", "associated", "both"]);
});

test("validates category edits and normalizes association add/remove input", () => {
  assert.equal(validateResourceCategory("guide"), "guide");
  assert.throws(() => validateResourceCategory("video"), /valid Resource category/);
  assert.deepEqual(normalizeExperienceIds(["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "bad"]), ["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"]);
  assert.deepEqual(normalizeExperienceIds([]), []);
});

test("archived and draft resources cannot be newly selected", () => {
  assert.equal(isResourceSelectable("active"), true);
  assert.equal(isResourceSelectable("archived"), false);
  assert.equal(isResourceSelectable("draft"), false);
});
