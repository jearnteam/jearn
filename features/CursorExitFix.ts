import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";

/**
 * Ensures cursor never ends up INSIDE atom nodes (math, tag, etc.)
 * Does NOT interfere with typing, arrow keys, clicking, or focus.
 */
export const CursorExitFix = Extension.create({
  name: "cursorExitFix",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("cursor-exit-fix"),

        appendTransaction(_trs, _oldState, newState) {
          const sel = newState.selection;

          // only collapsed cursor
          if (!sel.empty) return null;

          const $pos = sel.$from;

          // If caret is inside an atom node → push it out
          if ($pos.parent.type.spec.atom) {
            const after = $pos.before() + $pos.parent.nodeSize;
            return newState.tr.setSelection(
              TextSelection.create(newState.doc, after)
            );
          }

          return null;
        },
      }),
    ];
  },
});
