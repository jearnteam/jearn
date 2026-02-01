import { Extension } from "@tiptap/core";
import { Plugin, NodeSelection, TextSelection } from "prosemirror-state";
import { Fragment } from "prosemirror-model";
import type { Node as PMNode } from "prosemirror-model";

const META_KEY = "restore-prism-block";
const HARD_DELETE_KEY = "prism-hard-delete";

const normalizeCode = (s: string) =>
  s
    .replace(/<br\s*\/?>/gi, "\n") // legacy safety
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .trimEnd();

export const RestorePrismBlockOnDelete = Extension.create({
  name: "restorePrismBlockOnDelete",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        /* ---------------------------------------------
         * CAPTURE DELETE INTENT
         * ------------------------------------------- */
        filterTransaction(tr, state) {
          // 🚨 HARD DELETE — bypass restore logic entirely
          if (tr.getMeta(HARD_DELETE_KEY)) {
            return true;
          }
        
          const sel = state.selection;
        
          // 1️⃣ NodeSelection delete → revert
          if (
            sel instanceof NodeSelection &&
            sel.node.type.name === "prismBlock"
          ) {
            tr.setMeta(META_KEY, {
              pos: sel.from,
              attrs: sel.node.attrs,
            });
            return true;
          }
        
          // 2️⃣ Backspace at start of paragraph AFTER prismBlock
          if (sel instanceof TextSelection && sel.empty) {
            const $from = sel.$from;
        
            if ($from.parentOffset !== 0) return true;
            if ($from.depth < 1) return true;
        
            const parent = $from.node($from.depth - 1);
            const index = $from.index($from.depth - 1);
            if (index === 0) return true;
        
            const prevNode = parent.child(index - 1);
            if (prevNode.type.name !== "prismBlock") return true;
        
            const pos = $from.before($from.depth) - prevNode.nodeSize;
            if (pos < 0) return true;
        
            tr.setMeta(META_KEY, {
              pos,
              attrs: prevNode.attrs,
            });
          }
        
          return true;
        }
        ,

        /* ---------------------------------------------
         * RESTORE BLOCK AS PARAGRAPHS
         * ------------------------------------------- */
        appendTransaction(trs, _oldState, newState) {
          const metaTr = trs.find((tr) => tr.getMeta(META_KEY));
          if (!metaTr) return null;

          const meta = metaTr.getMeta(META_KEY);
          if (!meta || meta.restored) return null;

          const { pos, attrs } = meta;
          if (typeof pos !== "number" || !attrs) return null;

          // Confirm deletion actually happened
          let mappedPos = pos;
          let deleted = false;

          for (const tr of trs) {
            const res = tr.mapping.mapResult(mappedPos);
            mappedPos = res.pos;
            if (res.deleted) {
              deleted = true;
              break;
            }
          }
          if (!deleted) return null;

          const { schema, doc } = newState;

          /* 🔑 CANONICAL SOURCE: attrs.code */
          const code = normalizeCode(attrs.code ?? "");
          if (!code) return null;

          let lines: string[];
          const lang =
            typeof attrs.language === "string" && attrs.language !== "text"
              ? attrs.language
              : "";

          lines = [`\`\`\`${lang}`, ...code.split("\n"), "```"];

          const paragraphs = lines.map((line: string) =>
            schema.nodes.paragraph.create(null, line ? schema.text(line) : null)
          );

          if (!paragraphs.length) return null;

          const safePos = Math.min(Math.max(1, mappedPos), doc.content.size);

          const tr = newState.tr.replaceWith(
            safePos,
            safePos,
            Fragment.fromArray(paragraphs)
          );

          tr.setMeta(META_KEY, { restored: true });

          // Cursor to end
          const size = paragraphs.reduce(
            (sum: number, p: PMNode) => sum + p.nodeSize,
            0
          );

          const endPos = Math.min(safePos + size - 1, tr.doc.content.size);

          tr.setSelection(TextSelection.create(tr.doc, endPos));
          return tr;
        },
      }),
    ];
  },
});
