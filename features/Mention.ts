// features/Mention.ts
import { Node, mergeAttributes } from "@tiptap/core";

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

  addAttributes() {
    return {
      uid: { default: null },
      userId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-mention]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      {
        "data-mention": "true",
        "data-uid": HTMLAttributes.uid,
        "data-userid": HTMLAttributes.userId,
        class:
          "mention px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium",
      },
      `@${HTMLAttributes.userId}`,
    ];
  },
  addCommands() {
    return {
      insertMention:
        (attrs) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs,
            })
            .insertContent(" ")
            .run();
        },
    };
  },
});
