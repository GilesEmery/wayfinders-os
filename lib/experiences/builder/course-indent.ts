import { Node } from "@tiptap/core";

// Explicit markers preserve indentation without turning paragraphs into code.
export const CourseIndent = Node.create({
  name: "courseIndent",
  group: "block",
  content: "block+",
  parseHTML: () => [{ tag: "div[data-course-indent]" }],
  renderHTML: () => ["div", { "data-course-indent": "", class: "course-text-indent" }, 0],
  markdownTokenizer: {
    name: "courseIndent",
    level: "block",
    start: (source: string) => source.indexOf(":::course-indent"),
    tokenize(source, _tokens, lexer) {
      if (!source.startsWith(":::course-indent\n")) return;
      const lines = source.split("\n");
      let depth = 0;
      let length = 0;
      for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        length += line.length + (index < lines.length - 1 ? 1 : 0);
        if (line === ":::course-indent") depth++;
        if (line === ":::end-course-indent") depth--;
        if (depth === 0) return { type: "courseIndent", raw: source.slice(0, length), tokens: lexer.blockTokens(lines.slice(1, index).join("\n")) };
      }
    },
  },
  parseMarkdown: (token, helpers) => helpers.createNode("courseIndent", {}, helpers.parseChildren(token.tokens ?? [])),
  renderMarkdown: (node, helpers) => `:::course-indent\n${helpers.renderChildren(node.content ?? [], "\n\n")}\n:::end-course-indent`,
});
