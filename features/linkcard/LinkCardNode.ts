import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import LinkCardView from "./LinkCardView";

export type LinkCardAttrs = {
  url: string;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  siteName?: string | null;
  domain?: string | null;
  loading?: boolean;
  error?: string | null;
};

export const LinkCardNode = Node.create({
  name: "linkCard",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      url: { default: "" },
      title: { default: null },
      description: { default: null },
      image: { default: null },
      siteName: { default: null },
      domain: { default: null },
      loading: { default: true },
      error: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-link-card="true"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-link-card": "true",
        "data-url": HTMLAttributes.url,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LinkCardView);
  },

  addCommands() {
    return {
      insertLinkCard:
        (url: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { url, loading: true, error: null },
          });
        },

      updateLinkCard:
        (pos: number, attrs: Partial<LinkCardAttrs>) =>
        ({ tr, state, dispatch }) => {
          const node = state.doc.nodeAt(pos);
          if (!node || node.type.name !== this.name) return false;
          const next = { ...node.attrs, ...attrs };
          tr.setNodeMarkup(pos, undefined, next);
          dispatch?.(tr);
          return true;
        },
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    linkCard: {
      insertLinkCard: (url: string) => ReturnType;
      updateLinkCard: (pos: number, attrs: Partial<LinkCardAttrs>) => ReturnType;
    };
  }
}
