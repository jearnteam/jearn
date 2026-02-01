import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";
import { Slice } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";

export const PreserveEmptyLinesOnPaste = Extension.create({
  name: "preserveEmptyLinesOnPaste",

  addProseMirrorPlugins() {
    const plugin: Plugin<any> = new Plugin({
      props: {
        handlePaste(view: EditorView, event: ClipboardEvent): boolean {
          const clipboard = event.clipboardData;
          if (!clipboard) return false;

          const text = clipboard.getData("text/plain");
          if (!text) return false;

          const html = clipboard.getData("text/html");

          const { state } = view;
          const { $from } = state.selection;

          // ❌ Do NOT interfere with code / prism / pre blocks
          const parent = $from.parent.type.name;
          if (
            parent === "codeBlock" ||
            parent === "prismBlock" ||
            parent === "pre"
          ) {
            return false;
          }

          // ❌ Let TipTap handle rich HTML paste (important for code blocks)
          if (html) {
            return false;
          }

          // ✅ Now we know this is plain-text paragraph paste
          const { schema } = state;
          const lines = text.replace(/\r/g, "").split("\n");

          const nodes = [];

          for (const line of lines) {
            if (line.trim() === "") {
              nodes.push(schema.nodes.paragraph.create());
            } else {
              nodes.push(
                schema.nodes.paragraph.create(
                  null,
                  schema.text(line)
                )
              );
            }
          }

          if (!nodes.length) return false;

          const fragment = schema.nodes.doc.create(null, nodes).content;
          const slice = new Slice(fragment, 0, 0);

          const tr = state.tr.replaceSelection(slice);
          view.dispatch(tr.scrollIntoView());

          return true; // ✅ we intentionally handled this paste
        },
      },
    });

    return [plugin];
  },
});
