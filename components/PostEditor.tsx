"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Strike from "@tiptap/extension-strike";
import { useEffect, useRef } from "react";
import tippy, { type Instance } from "tippy.js";
import "tippy.js/dist/tippy.css";
import { MathExtension } from "@/components/MathExtension";
import "katex/dist/katex.min.css";

interface PostEditorProps {
  onChange: (contentHtml: string) => void;
}

export default function PostEditor({ onChange }: PostEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Underline, Strike, MathExtension],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[120px] w-full rounded-md border border-gray-300 p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500",
        "data-placeholder": "What's happening?",
      },
    },
  });

  const menuRef = useRef<HTMLDivElement>(null);
  const tippyRef = useRef<Instance | null>(null);
  const lastSelRef = useRef<{ from: number; to: number } | null>(null);

  useEffect(() => {
    if (!editor) return;

    const handler = () => onChange(editor.getHTML());
    editor.on("update", handler);

    // ✅ GOOD: return a function that calls editor.off()
    return () => {
      editor.off("update", handler);
    };
  }, [editor, onChange]);

  // floating menu
  useEffect(() => {
    if (!editor || !menuRef.current) return;

    const reference = document.createElement("div");
    document.body.appendChild(reference);

    const instance = tippy(reference, {
      getReferenceClientRect: null,
      content: menuRef.current!,
      trigger: "manual",
      placement: "top",
      interactive: true,
      hideOnClick: false,
      appendTo: document.body,
    });

    tippyRef.current = instance;

    const handleSelectionUpdate = () => {
      const { from, to } = editor.state.selection;
      lastSelRef.current = { from, to };
      if (from === to) {
        instance.hide();
        return;
      }

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      instance.setProps({
        getReferenceClientRect: () => rect,
      });
      instance.show();
    };

    const handleTransaction = () => {
      const { from, to } = editor.state.selection;
      if (from === to) instance.hide();
    };

    editor.on("selectionUpdate", handleSelectionUpdate);
    editor.on("transaction", handleTransaction);

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
      editor.off("transaction", handleTransaction);
      instance.destroy();
      document.body.removeChild(reference);
    };
  }, [editor]);

  // ⛔ if editor not ready, render nothing
  if (!editor) return null;

  // ✅ from here on, editor is guaranteed non-null
  const e = editor;

  const withRestoredSelection = (
    chainOp: (chain: ReturnType<typeof e.chain>) => ReturnType<typeof e.chain>
  ) => {
    const sel = lastSelRef.current;
    let chain = e.chain().focus();
    if (sel && sel.from !== sel.to) {
      chain = chain.setTextSelection(sel);
    }
    chainOp(chain).run();
  };

  const preventMouseDown = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Floating Toolbar */}
      <div
        ref={menuRef}
        className="flex gap-2 bg-white border border-gray-300 rounded-md shadow-md p-1 text-black"
      >
        <button
          onMouseDown={preventMouseDown}
          onClick={() => withRestoredSelection((c) => c.toggleBold())}
          className={`px-2 py-1 rounded ${
            e.isActive("bold") ? "bg-gray-200 font-bold" : ""
          }`}
        >
          B
        </button>

        <button
          onMouseDown={preventMouseDown}
          onClick={() => withRestoredSelection((c) => c.toggleItalic())}
          className={`px-2 py-1 rounded ${
            e.isActive("italic") ? "bg-gray-200 italic" : ""
          }`}
        >
          I
        </button>

        <button
          onMouseDown={preventMouseDown}
          onClick={() => withRestoredSelection((c) => c.toggleUnderline())}
          className={`px-2 py-1 rounded ${
            e.isActive("underline") ? "bg-gray-200 underline" : ""
          }`}
        >
          U
        </button>

        <button
          onMouseDown={preventMouseDown}
          onClick={() => withRestoredSelection((c) => c.toggleStrike())}
          className={`px-2 py-1 rounded ${
            e.isActive("strike") ? "bg-gray-200 line-through" : ""
          }`}
        >
          S
        </button>

        <button
          onMouseDown={preventMouseDown}
          onClick={() => withRestoredSelection((c) => c.toggleCode())}
          className={`px-2 py-1 rounded ${
            e.isActive("code") ? "bg-gray-200" : ""
          }`}
        >
          {"</>"}
        </button>
        <button
          onMouseDown={preventMouseDown}
          onClick={() => {
            const latex = prompt("Enter LaTeX:");
            if (latex) withRestoredSelection((c) => c.insertMath(latex));
          }}
          className="px-2 py-1 rounded hover:bg-gray-100"
        >
          ∑
        </button>
      </div>

      {/* TipTap Editor */}
      <EditorContent editor={e} />

      {/* Character Counter */}
      <div className="text-right text-sm text-gray-400 mt-1">
        {e.getText().length}/280
      </div>
    </div>
  );
}
