// @/features/HeadingPatch.ts
import { Extension, type CommandProps } from "@tiptap/core";
import type { Level } from "@tiptap/extension-heading";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    headingPatch: {
      setHeadingLevel: (attrs: { level: Level }) => ReturnType;
    };
  }
}

export const HeadingPatch = Extension.create({
  name: "headingPatch",

  addCommands() {
    return {
      setHeadingLevel:
        (attrs) =>
        ({ editor, chain }) => {
          const isSame = editor.isActive("heading", { level: attrs.level });

          if (isSame) {
            return chain().setParagraph().run();
          }

          return chain().setNode("heading", attrs).run();
        },
    };
  },
});
