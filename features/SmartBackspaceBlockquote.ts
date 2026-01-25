import { Extension } from "@tiptap/core";
import { TextSelection } from "prosemirror-state";

export const SmartBackspaceBlockquote = Extension.create({
  name: "smartBackspaceBlockquote",

  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const { editor } = this;
        const { state } = editor;
        const { selection, doc } = state;
        const { $from } = selection;

        // Only collapsed cursor
        if (!selection.empty) return false;

        // Only empty paragraph
        if (
          $from.parent.type.name !== "paragraph" ||
          $from.parent.content.size !== 0
        ) {
          return false;
        }

        const depth = $from.depth;
        const parentDepth = depth - 1;

        /* ======================================================
         * CASE A: Empty paragraph INSIDE blockquote
         * → exit blockquote (exactly like list)
         * ====================================================== */
        if (editor.isActive("blockquote")) {
          editor.commands.lift("blockquote");
          return true;
        }

        /* ======================================================
         * CASE B: Empty paragraph BELOW a blockquote
         * → delete paragraph and move cursor INTO blockquote
         * ====================================================== */
        if (parentDepth < 0) return false;

        const index = $from.index(parentDepth);
        if (index === 0) return false;

        const parentNode = $from.node(parentDepth);
        const prevNode = parentNode.child(index - 1);

        if (!prevNode || prevNode.type.name !== "blockquote") {
          return false;
        }

        // Delete the empty paragraph
        const paraPos = $from.before(depth);
        let tr = state.tr.delete(
          paraPos,
          paraPos + $from.parent.nodeSize
        );

        // Move cursor to end of last paragraph in blockquote
        let pos = $from.before(parentDepth) + 1;
        for (let i = 0; i < index - 1; i++) {
          pos += parentNode.child(i).nodeSize;
        }

        const lastChild = prevNode.lastChild;
        if (!lastChild) return false;

        pos += prevNode.nodeSize - lastChild.nodeSize - 2;
        pos += lastChild.nodeSize - 1;

        tr = tr.setSelection(TextSelection.create(tr.doc, pos));
        editor.view.dispatch(tr);

        return true;
      },
    };
  },
});
