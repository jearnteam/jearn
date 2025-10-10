// components/MathExtension.ts
import { Node, mergeAttributes } from "@tiptap/core";
import katex from "katex";

/** Tell TipTap (and TS) that we have a custom command called `insertMath` */
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    math: {
      /** Insert an inline KaTeX node with the given LaTeX string */
      insertMath: (latex: string) => ReturnType;
    };
  }
}

export const MathExtension = Node.create({
  name: "math",
  group: "inline",
  inline: true,
  atom: true,

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
      mergeAttributes(HTMLAttributes, { "data-type": "math", class: "math-node" }),
    ];
  },

  /** Render with KaTeX in the browser */
  addNodeView() {
    return ({ node }) => {
      const span = document.createElement("span");
      span.dataset.type = "math";
      span.className = "math-node";
      try {
        katex.render(node.attrs.latex || "", span, { throwOnError: false });
      } catch {
        span.textContent = node.attrs.latex || "";
      }
      return { dom: span };
    };
  },

  /** Register the command (with proper typing) */
  addCommands() {
    return {
      insertMath:
        (latex: string) =>
        ({ chain }) => {
          return (
            chain()
              .insertContent({ type: this.name, attrs: { latex } })
              // you can add .focus() or selection restore before insert if needed
              .run()
          );
        },
    };
  },
});
