import { Extension } from "@tiptap/core";
import {
  Plugin,
  PluginKey,
  TextSelection,
  NodeSelection,
} from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

export const InlineBackspaceFix = Extension.create({
  name: "inlineBackspaceFix",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("inline-backspace-fix"),

        props: {
          handleKeyDown(view: EditorView, event: KeyboardEvent) {
            if (event.key !== "Backspace") return false;

            const { state } = view;
            const { selection } = state;
            const tr = state.tr;

            // 1) NodeSelection on atom (math, tag, etc.)
            if (
              selection instanceof NodeSelection &&
              selection.node.type.spec.atom
            ) {
              event.preventDefault();
              view.dispatch(tr.delete(selection.from, selection.to));
              return true;
            }

            // 2) For range selections, let default behavior handle it
            if (!selection.empty) {
              return false;
            }

            const { $from } = selection;
            const before = $from.nodeBefore;
            if (!before) return false;

            // 3) If before is text → manually delete one char
            if (before.isText) {
              event.preventDefault();
              const from = $from.pos - 1;
              const to = $from.pos;
              view.dispatch(tr.delete(from, to));
              return true;
            }

            // 4) If before is an atom (tag, math, etc.) → delete whole node
            if (before.type.spec.atom) {
              event.preventDefault();
              const from = $from.pos - before.nodeSize;
              const to = $from.pos;
              view.dispatch(tr.delete(from, to));
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});
