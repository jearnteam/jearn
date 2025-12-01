import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { Extension } from "@tiptap/core";

export const ParagraphIntegrityFix = Extension.create({
  name: "paragraphIntegrityFix",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("paragraph-integrity"),

        appendTransaction(transactions, oldState, newState) {
          let tr = newState.tr;
          let modified = false;

          newState.doc.descendants((node, pos) => {
            if (node.type.name !== "paragraph") return true;

            // Paragraph is valid
            if (node.childCount > 0) return true;

            // FIX: Insert a safe text node
            const text = newState.schema.text(" ");
            tr.insert(pos + 1, text);
            modified = true;

            return true;
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});
