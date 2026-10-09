import assert from "node:assert/strict";
import test from "node:test";
import StarterKit from "@tiptap/starter-kit";
import { MarkdownManager } from "@tiptap/markdown";
import { CourseIndent } from "./course-indent.ts";

const markdown = new MarkdownManager({ extensions: [StarterKit, CourseIndent] });

test("nested text indentation survives Markdown saving alongside lists and headings", () => {
  const source = ":::course-indent\nA paragraph with **bold** text.\n\n:::course-indent\n#### Nested title\n\n- First\n  - Nested bullet\n\n1. Numbered\n2. Another\n:::end-course-indent\n:::end-course-indent\n\nOutside paragraph.";
  const document = markdown.parse(source);
  assert.equal(document.content?.[0].type, "courseIndent");
  assert.equal(document.content?.[0].content?.[1].type, "courseIndent");
  assert.equal(document.content?.[1].type, "paragraph");
  assert.deepEqual(markdown.parse(markdown.serialize(document)), document);
});

test("an unfinished indentation marker does not swallow following content", () => {
  const document = markdown.parse(":::course-indent\nKeep this text.");
  assert.ok(JSON.stringify(document).includes("Keep this text."));
});
