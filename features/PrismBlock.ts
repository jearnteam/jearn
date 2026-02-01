// features/PrismBlock.ts
import { Node } from "@tiptap/core";

export const PrismBlock = Node.create({
  name: "prismBlock",

  group: "block",
  atom: true,
  selectable: true,
  isolating: true,
  defining: true,

  addAttributes() {
    return {
      language: { default: "text" },
      code: { default: "" },

      // 🔑 NEW: text before it became a code block
      originalText: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "pre[data-prism]",
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return false;

          const codeEl = node.querySelector("code");
          const language = node.getAttribute("data-language") || "text";
          const code =
            codeEl?.innerText?.replace(/\r\n/g, "\n").replace(/\n$/, "") ??
            "";

          return {
            language,
            code,
            originalText: code ? `\`\`\`${language}\n${code}\n\`\`\`` : "",
          };
        },
      },
    ];
  },
  renderHTML({ node }) {
    return [
      "pre",
      {
        "data-prism": "true",
        "data-language": node.attrs.language,
        contenteditable: "false",
      },
      ["code", { class: `language-${node.attrs.language}` }, node.attrs.code],
    ];
  },
});
