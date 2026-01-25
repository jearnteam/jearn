// features/BackspaceExitListLikeEnter.ts
import { Extension } from "@tiptap/core";

export const BackspaceExitListLikeEnter = Extension.create({
  name: "backspaceExitListLikeEnter",

  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const { editor } = this;
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        if (!selection.empty) return false;

        const parent = $from.parent;

        const isEmptyParagraph =
          parent.type.name === "paragraph" &&
          parent.content.size === 0;

        const isInListItem =
          $from.depth >= 2 &&
          $from.node($from.depth - 1)?.type.name === "listItem";

        if (!isEmptyParagraph || !isInListItem) {
          return false;
        }

        // 🔥 EXACT same behavior as double Enter
        editor.commands.liftListItem("listItem");

        return true; // consume Backspace
      },
    };
  },
});
