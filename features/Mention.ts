// features/Mention.ts
import { Node } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mention: {
      insertMention: (attrs: { uid: string; userId: string }) => ReturnType;
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
      userId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-userid"),
        renderHTML: (attrs) =>
          attrs.userId ? { "data-userid": attrs.userId } : {},
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "span[data-mention]",
        getAttrs: (node) => ({
          uid: (node as HTMLElement).getAttribute("data-uid"),
          userId: (node as HTMLElement).getAttribute("data-userid"),
        }),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    // ⚠️ used for serialization only
    return [
      "span",
      {
        "data-mention": "true",
        "data-uid": HTMLAttributes.uid,
        "data-userid": HTMLAttributes.userId,
      },
      `@${HTMLAttributes.userId}`,
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("span");

      dom.dataset.mention = "true";
      dom.dataset.uid = node.attrs.uid ?? "";
      dom.dataset.userid = node.attrs.userId ?? "";

      dom.textContent = `@${node.attrs.userId}`;
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
