// features/Mention.ts
import { Node } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mention: {
      insertMention: (attrs: { uid: string; uniqueId: string }) => ReturnType;
    };
  }
}

export const Mention = Node.create({
  name: "mention",

  group: "inline",
  inline: true,
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      uid: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-uid"),
        renderHTML: (attrs) => (attrs.uid ? { "data-uid": attrs.uid } : {}),
      },
      uniqueId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-uniqueId"),
        renderHTML: (attrs) =>
          attrs.uniqueId ? { "data-uniqueId": attrs.uniqueId } : {},
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "span[data-mention]",
        getAttrs: (node) => ({
          uid: (node as HTMLElement).getAttribute("data-uid"),
          uniqueId: (node as HTMLElement).getAttribute("data-uniqueId"),
        }),
      },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    const { uid, uniqueId } = node.attrs;

    return [
      "span",
      {
        ...HTMLAttributes,
        "data-mention": "true",
        "data-uid": uid,
        "data-uniqueId": uniqueId,
        class: "mention",
      },
      `@${uniqueId}`,
    ];
  },
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("span");

      dom.dataset.mention = "true";
      dom.dataset.uid = node.attrs.uid ?? "";
      dom.dataset.uniqueId = node.attrs.uniqueId ?? "";

      dom.textContent = `@${node.attrs.uniqueId}`;
      dom.className = "mention";

      return {
        dom,
        stopEvent: () => true,
      };
    };
  },
  addCommands() {
    return {
      insertMention:
        (attrs) =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs,
            })
            .insertContent(" ")
            .run(),
    };
  },
});
