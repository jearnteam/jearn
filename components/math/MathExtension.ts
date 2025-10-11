import { Node, mergeAttributes } from "@tiptap/core";
import katex from "katex";
import { Plugin, TextSelection } from "prosemirror-state";

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
  selectable: true,
  atom: true, // keep atomic behavior for easier handling

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
      dom.setAttribute("latex", node.attrs.latex);
      dom.className = "math-node";
      dom.style.cursor = "pointer";

      try {
        katex.render(node.attrs.latex || "", dom, { throwOnError: false });
      } catch {
        dom.textContent = node.attrs.latex || "";
      }

      // 📋 Copy with Ctrl+C or ⌘C
      dom.addEventListener("copy", (e) => {
        const ce = e as ClipboardEvent;
        ce.clipboardData?.setData("text/plain", node.attrs.latex);
        ce.preventDefault();
      });

      // 🖱️ Double-click to copy + highlight
      dom.addEventListener("dblclick", async () => {
        try {
          await navigator.clipboard.writeText(node.attrs.latex);
          dom.style.transition = "background 0.2s ease";
          dom.style.background = "#d1fae5";
          setTimeout(() => {
            dom.style.background = "";
          }, 400);
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
        ({ chain }) => {
          return chain()
            .insertContent([
              { type: this.name, attrs: { latex } },
              { type: "text", text: "\u200B" }, // 👈 zero-width space after math node
            ])
            .command(({ tr, dispatch }) => {
              const nextPos = tr.selection.to;
              tr.setSelection(
                // 👈 move cursor right after the zero-width space
                TextSelection.near(tr.doc.resolve(nextPos))
              );
              if (dispatch) dispatch(tr);
              return true;
            })
            .run();
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      // 🪄 Fix cursor click at end of math node
      new Plugin({
        props: {
          handleClick(view, pos) {
            const $pos = view.state.doc.resolve(pos);
            const nodeBefore = $pos.nodeBefore;

            if (nodeBefore && nodeBefore.type.name === "math") {
              // Insert zero-width space after the math node
              const tr = view.state.tr.insertText("\u200B", pos);
              const sel = TextSelection.near(tr.doc.resolve(pos + 1));
              tr.setSelection(sel);
              view.dispatch(tr);
              view.focus();
              return true;
            }
            return false;
          },

          // 📋 Handle copy properly for selection on atom node
          handleDOMEvents: {
            copy: (view, event: ClipboardEvent) => {
              const { state } = view;
              const { from, to } = state.selection;
              const slice = state.doc.slice(from, to);
              const node = slice.content.firstChild;

              if (node && node.type.name === "math") {
                event.clipboardData?.setData("text/plain", node.attrs.latex);
                event.preventDefault();
                return true;
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});
