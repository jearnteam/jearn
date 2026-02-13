import { Node, mergeAttributes } from "@tiptap/core";

export const InlineLinkNode = Node.create({
  name: "inlineLink",

  group: "inline",
  inline: true,
  atom: true, // 🔥 atomic
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      href: { default: "" },
      text: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "a[data-inline-link]",
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        href: node.attrs.href,
        "data-inline-link": "true",
        contenteditable: "false", // 🔥 prevents editing
        class:
          "text-blue-600 underline cursor-pointer",
      }),
      node.attrs.text,
    ];
  },
});
