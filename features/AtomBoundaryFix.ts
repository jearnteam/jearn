
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";

export const AtomBoundaryFix = Extension.create({
  name: "atomBoundaryFix",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("atom-boundary-fix"),

        appendTransaction(_trs, oldState, newState) {
          const sel = newState.selection;

          // Only fix collapsed selections
          if (!sel.empty) return null;

          const $pos = sel.$from;

          const before = $pos.nodeBefore;
          const after = $pos.nodeAfter;

          // Only fix if last action inserted an atom (tag/math)
          // AND next thing is normal text, but delete won't work
          const isAtomBefore = before?.type?.spec?.atom;
          const isTextAfter = after?.isText;

          if (!isAtomBefore || !isTextAfter) return null;

          // Compute safe position: right where caret is NOW,
          // but forcing ProseMirror out of atom mode
          const target = sel.from;

          return newState.tr.setSelection(
            TextSelection.create(newState.doc, target)
          );
        },
      }),
    ];
  },
});
