import { Node, mergeAttributes } from "@tiptap/core";
import katex from "katex";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";

export const mathPluginKey = new PluginKey("math-handler");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    math: {
      insertMath: (latex: string) => ReturnType;
    };
  }
}

export const MathExtension = Node.create({
  name: "math",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      latex: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-type='math']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "math",
        class: "math-node",
      }),
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("span");
      dom.dataset.type = "math";

      // ✅ strip zero-width chars before render
      const cleanLatex = (node.attrs.latex || "").replace(
        /[\u200B-\u200D\uFEFF]/g,
        ""
      );
      dom.setAttribute("latex", cleanLatex);
      dom.className = "math-node";
      dom.style.cursor = "pointer";

      try {
        katex.render(cleanLatex, dom, { throwOnError: false, strict: "warn" });
      } catch {
        dom.textContent = cleanLatex;
      }

      dom.addEventListener("copy", (e) => {
        const ce = e as ClipboardEvent;
        ce.clipboardData?.setData("text/plain", cleanLatex);
        ce.preventDefault();
      });

      dom.addEventListener("dblclick", async () => {
        try {
          await navigator.clipboard.writeText(cleanLatex);
          dom.style.transition = "background 0.2s ease";
          dom.style.background = "#d1fae5";
          setTimeout(() => (dom.style.background = ""), 400);
        } catch (err) {
          console.error("Clipboard copy failed:", err);
        }
      });

      return { dom };
    };
  },

  addCommands() {
    return {
      insertMath:
        (latex: string) =>
        ({ state, dispatch, view }) => {
          const cleanLatex = (latex || "").replace(
            /[\u200B-\u200D\uFEFF]/g,
            ""
          );
          const { tr, schema } = state;

          const { from, to } = state.selection;

          // 1️⃣ Always delete selected text first
          if (from !== to) {
            tr.delete(from, to);
          }

          // New insertion start position
          const pos = tr.selection.from;

          // 2️⃣ Insert math node
          const mathNode = schema.nodes.math.create({ latex: cleanLatex });

          // 3️⃣ Add spacer after math node
          const spacer = schema.text("\u200B");

          tr.insert(pos, mathNode);
          tr.insert(pos + 1, spacer);

          // 4️⃣ Move cursor after spacer
          const targetPos = pos + 2;
          tr.setSelection(TextSelection.create(tr.doc, targetPos));

          if (dispatch) dispatch(tr);

          // 5️⃣ Fix focus
          setTimeout(() => {
            if (view) {
              view.focus();
              const domSelection = window.getSelection();
              const domAtPos = view.domAtPos(targetPos);
              if (domSelection && domAtPos.node) {
                domSelection.removeAllRanges();
                const range = document.createRange();
                range.setStart(domAtPos.node, domAtPos.offset ?? 0);
                range.collapse(true);
                domSelection.addRange(range);
              }
            }
          }, 0);

          return true;
        },
    };
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: mathPluginKey,
        props: {
          handleClick(view, pos) {
            const $pos = view.state.doc.resolve(pos);
            const nodeBefore = $pos.nodeBefore;

            if (nodeBefore && nodeBefore.type.name === "math") {
              // ✅ keep spacer for UX but prevent it from persisting
              const tr = view.state.tr.insertText("\u200B", pos);
              const sel = TextSelection.create(tr.doc, pos + 1);
              tr.setSelection(sel);
              view.dispatch(tr);
              view.focus();
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});
