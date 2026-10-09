import test from "node:test";
import assert from "node:assert/strict";
import StarterKit from "@tiptap/starter-kit";
import { MarkdownManager } from "@tiptap/markdown";
import { CourseTextSize } from "./course-text-size.ts";

const markdown = new MarkdownManager({ extensions: [StarterKit, CourseTextSize] });
test("only selected text receives a size and formatting survives saving", () => {
  const doc = markdown.parse("Before [[size:h1]]**highlighted**[[/size]] after.");
  const nodes = doc.content?.[0].content ?? [];
  assert.equal(nodes[0].marks, undefined);
  assert.ok(nodes[1].marks?.some(mark => mark.type === "courseTextSize" && mark.attrs?.size === "h1"));
  assert.ok(nodes[1].marks?.some(mark => mark.type === "bold"));
  assert.equal(nodes[2].marks, undefined);
  const reloaded = markdown.parse(markdown.serialize(doc));
  const marks = reloaded.content?.[0].content?.[1].marks ?? [];
  assert.deepEqual([...marks].sort((a, b) => a.type.localeCompare(b.type)), [...(nodes[1].marks ?? [])].sort((a, b) => a.type.localeCompare(b.type)));
  assert.equal(reloaded.content?.[0].content?.[0].marks, undefined);
  assert.equal(reloaded.content?.[0].content?.[2].marks, undefined);
});
test("all four sizes round-trip without resizing neighboring text", () => {
  for (const size of ["h1", "h2", "h3", "h4"]) {
    const doc = markdown.parse(`[[size:${size}]]chosen[[/size]] normal`);
    assert.deepEqual(markdown.parse(markdown.serialize(doc)), doc);
    assert.equal(doc.content?.[0].content?.[1].marks, undefined);
  }
});
