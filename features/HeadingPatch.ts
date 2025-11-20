import { Extension } from "@tiptap/core";
import type { Level } from "@tiptap/extension-heading";

export const HeadingPatch = Extension.create({
  name: "headingPatch",

  addCommands() {
    return {
      toggleHeading:
        (attrs: { level: Level }) =>
        ({ editor, chain }) => {
          // Already same level → convert to paragraph
          if (editor.isActive("heading", { level: attrs.level })) {
            return chain().setParagraph().run();
          }

          // Switch to heading WITHOUT calling toggleHeading() again
          return chain().setNode("heading", attrs).run();
        },
    };
  },
});
