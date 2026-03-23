import { Extension } from "@tiptap/core";
import { keymap } from "prosemirror-keymap";

const normalizeFence = (s: string) =>
  s
    .replace(/\u200B/g, "")   // zero-width
    .replace(/\n/g, "")       // line breaks
    .replace(/\s/g, "");      // ALL whitespace

export const CodeFenceHandler = Extension.create({
  name: "codeFenceHandler",

  addProseMirrorPlugins() {
    return [
      keymap({
        Enter: (state, dispatch) => {
          const { selection, doc, schema } = state;
          const { $from, empty } = selection;

          if (!empty) return false;
          if ($from.depth !== 1) return false; // top-level paragraph only

          const currentNode = $from.parent;
          if (currentNode.type.name !== "paragraph") return false;

          const raw = currentNode.textBetween(
            0,
            currentNode.content.size,
            "\n",
            "\n"
          );
          
          const currentText = normalizeFence(raw);
          
          // ✅ EXACT match, but invisible-safe
          if (currentText !== "```") return false;

          // closing fence must be exactly ```
          if (currentText !== "```") return false;

          // cursor must be at end of current paragraph
          if ($from.parentOffset !== currentNode.content.size) return false;

          const prismBlock = schema.nodes.prismBlock;
          if (!prismBlock) return false;

          const currentIndex = $from.index(0); // index in doc
          const codeLines: string[] = [];
          let language: string | null = null;
          let openIndex = -1;

          // scan previous top-level nodes
          for (let i = currentIndex - 1; i >= 0; i--) {
            const node = doc.child(i);

            if (node.type.name !== "paragraph") {
              continue;
            }

            const rawLine = node.textBetween(0, node.content.size, "\n", "\n");
            const line = normalizeFence(rawLine);

            const openMatch = line.match(/^```(\w+)?$/);

            if (openMatch) {
              language = openMatch[1] ?? null;
              openIndex = i;
              break;
            }

            codeLines.unshift(rawLine);
          }

          if (openIndex === -1) return false;

          // compute absolute positions of opening and closing fence paragraphs
          let from = 0;
          for (let i = 0; i < openIndex; i++) {
            from += doc.child(i).nodeSize;
          }

          let to = 0;
          for (let i = 0; i <= currentIndex; i++) {
            to += doc.child(i).nodeSize;
          }

          const originalText = doc.textBetween(from, to, "\n");

          const tr = state.tr
            .delete(from, to)
            .insert(
              from,
              prismBlock.create({
                language,
                code: codeLines.join("\n"),
                originalText,
              })
            );

          dispatch?.(tr.scrollIntoView());
          return true;
        },
      }),
    ];
  },
});