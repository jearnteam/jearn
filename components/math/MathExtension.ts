import { Node, mergeAttributes, type CommandProps } from "@tiptap/core";
import katex from "katex";
import { TextSelection } from "prosemirror-state";

/**
 * Command typing augmentation for Tiptap
 */
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    math: {
      insertMath: (latex: string) => ReturnType;
    };
  }
}

export const MathExtension = Node.create({
  name: "math",
  inline: true,
  group: "inline",
  atom: true,
  selectable: true,
  isolating: true,

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
        contenteditable: "false",
      }),
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("span");
      dom.dataset.type = "math";
      dom.className = "math-node";
      dom.setAttribute("contenteditable", "false");

      const clean = String(node.attrs.latex || "").trim();

      try {
        katex.render(clean, dom, { throwOnError: false });
      } catch {
        dom.textContent = clean;
      }

      // ⭐ DOUBLE-CLICK → COPY LATEX ⭐
      dom.addEventListener("dblclick", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        try {
          await navigator.clipboard.writeText(clean);
        } catch {}

        // visual feedback
        dom.style.transition = "background 0.25s ease";
        dom.style.background = "#c7d2fe";

        setTimeout(() => {
          dom.style.background = "";
        }, 350);
      });

      return {
        dom,
        stopEvent: () => true,
      };
    };
  },

  addCommands() {
    return {
      insertMath:
        (latex: string) =>
        ({ state, tr, dispatch }: CommandProps) => {
          const clean = (latex || "").trim();
          const { schema } = state;
          const { from, to } = tr.selection;

          const mathNode = schema.nodes.math.create({ latex: clean });

          let next = tr;
          if (from !== to) next = next.delete(from, to);

          const pos = next.selection.from;

          // Insert math node
          next = next.insert(pos, mathNode);

          // Insert ZWSP after math node
          const zwsp = schema.text("\u200B");
          next = next.insert(pos + mathNode.nodeSize, zwsp);

          // Put caret AFTER zwsp
          next = next.setSelection(
            TextSelection.create(next.doc, pos + mathNode.nodeSize + 1)
          );

          if (dispatch) dispatch(next);
          return true;
        },
    };
  },
});
