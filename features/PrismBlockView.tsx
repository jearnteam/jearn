import { NodeViewWrapper } from "@tiptap/react";
import Prism from "prismjs";
import { useEffect, useRef } from "react";
import type React from "react";
import type { CommandProps } from "@tiptap/core";
import { NodeSelection } from "prosemirror-state";

export function PrismBlockView({ node, editor, getPos }: any) {
  const { language, code } = node.attrs;
  const codeRef = useRef<HTMLElement>(null);

  /* ---------------- Highlight ---------------- */
  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [language, code]);

  /* ---------------- Selection ---------------- */
  const selectNode = () => {
    const pos = getPos?.();
    if (typeof pos !== "number") return;
    editor.chain().focus().setNodeSelection(pos).run();
  };

  /* ---------------- Revert ---------------- */
  const revertBlock = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    selectNode();
    editor.chain().deleteSelection().run();
  };

  /* ---------------- Copy (LOSSLESS) ---------------- */
  const onCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 🔑 MUST be raw attrs.code
    const raw = typeof code === "string" ? code : "";

    try {
      // Plain text preserves newlines EXACTLY
      await navigator.clipboard.writeText(raw);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = raw;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  };

  /* ---------------- Hard Delete ---------------- */
  const onDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const pos = getPos?.();
    if (typeof pos !== "number") return;

    editor
      .chain()
      .focus()
      .command(({ tr }: CommandProps) => {
        tr.setSelection(NodeSelection.create(tr.doc, pos));
        tr.setMeta("prism-hard-delete", true); // bypass restore
        tr.delete(pos, pos + node.nodeSize);
        return true;
      })
      .run();
  };

  return (
    <NodeViewWrapper as="div" className="relative group">
      {/* ───── ACTION BAR ───── */}
      <div
        contentEditable={false}
        className="
          absolute top-2 right-2 z-20
          flex gap-2
          opacity-0 group-hover:opacity-100
          transition
        "
      >
        <button
          onClick={onCopy}
          className="px-2 py-1 text-xs rounded bg-black/70 text-white"
        >
          Copy
        </button>

        <button
          onClick={revertBlock}
          title="Revert to ```"
          className="
            h-7 w-7 rounded
            bg-neutral-800/80 hover:bg-neutral-700
            text-neutral-200
            text-xs flex items-center justify-center
          "
        >
          ↩
        </button>

        <button
          onClick={onDelete}
          title="Delete code block"
          className="
            h-7 w-7 rounded
            bg-red-600/80 hover:bg-red-500
            text-white
            text-xs flex items-center justify-center
          "
        >
          ✕
        </button>
      </div>

      {/* ───── CODE BLOCK ───── */}
      <pre
        data-prism
        data-language={language}
        contentEditable={false}
        onClick={selectNode}
      >
        <code
          ref={codeRef}
          className={language ? `language-${language}` : "language-none"}
        >
          {code}
        </code>
      </pre>
    </NodeViewWrapper>
  );
}
