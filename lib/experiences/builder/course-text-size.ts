import { Mark } from "@tiptap/core";

export const CourseTextSize = Mark.create({
  name: "courseTextSize",
  addAttributes: () => ({ size: { default: "h4" } }),
  parseHTML: () => ["h1", "h2", "h3", "h4"].map(size => ({ tag: `span[data-course-text-size="${size}"]`, attrs: { size } })),
  renderHTML: ({ HTMLAttributes }) => ["span", { "data-course-text-size": HTMLAttributes.size, class: `course-text-size is-${HTMLAttributes.size}` }, 0],
  markdownTokenName: "courseTextSize",
  markdownTokenizer: {
    name: "courseTextSize", level: "inline",
    start: (source: string) => source.indexOf("[[size:"),
    tokenize(source, _tokens, lexer) {
      const match = /^\[\[size:(h[1-4])\]\]([\s\S]*?)\[\[\/size\]\]/.exec(source);
      if (match) return { type: "courseTextSize", raw: match[0], size: match[1], tokens: lexer.inlineTokens(match[2]) };
    },
  },
  parseMarkdown: (token, helpers) => helpers.applyMark("courseTextSize", helpers.parseInline(token.tokens ?? []), { size: token.size }),
  renderMarkdown: (node, helpers) => `[[size:${node.attrs?.size ?? "h4"}]]${helpers.renderChildren(node)}[[/size]]`,
});
