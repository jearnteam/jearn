import { Extension } from "@tiptap/core";
import { keymap } from "prosemirror-keymap";

const normalize = (s: string) => s.replace(/\u200B/g, "").trim();

export const CodeFenceHandler = Extension.create({
  name: "codeFenceHandler",

  addProseMirrorPlugins() {
    return [
      keymap({
        Enter: (state, dispatch) => {
          const { selection, doc, schema } = state;
          const { $from } = selection;
          const current = $from.parent;

          if (current.type.name !== "paragraph") return false;
          if ($from.parentOffset !== current.content.size) return false;
          if (normalize(current.textContent) !== "```") return false;

          const prismBlock = schema.nodes.prismBlock;
          if (!prismBlock) return false;

          let lang: string | null = null;
          const codeLines: string[] = [];

          let scanPos = $from.before();

          while (scanPos > 0) {
            const $pos = doc.resolve(scanPos);
            const node = $pos.nodeBefore;
            if (!node) break;

            scanPos -= node.nodeSize;

            if (node.type.name !== "paragraph") continue;

            // 🔑 FIX: preserve <br> as new lines
            const raw = node.textBetween(0, node.content.size, "\n", "\n");
            const text = normalize(raw);

            const match = text.match(/^```(\w+)?$/);
            if (match) {
              lang = match[1] ?? null;

              const from = scanPos;
              const to = $from.after();

              const originalText = doc.textBetween(from, to, "\n");

              const tr = state.tr.delete(from, to).insert(
                from,
                prismBlock.create({
                  language: lang,
                  code: codeLines.join("\n"),
                  originalText,
                })
              );

              dispatch?.(tr);
              return true;
            }

            codeLines.unshift(raw); // keep original line breaks
          }

          return false;
        },
      }),
    ];
  },
});
