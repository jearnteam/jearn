// features/FixHeadingEnter.ts
import { Extension } from "@tiptap/core";

export const FixHeadingEnter = Extension.create({
  name: "fixHeadingEnter",

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state } = this.editor;
        const { $from } = state.selection;

        // Only care about headings
        if ($from.parent.type.name !== "heading") {
          return false; // allow normal behavior
        }

        // Let ProseMirror do the split first
        requestAnimationFrame(() => {
          this.editor.commands.setParagraph();
        });

        // DO NOT block default Enter
        return false;
      },
    };
  },
});
