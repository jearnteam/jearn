"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import tippy, { type Instance } from "tippy.js";
import "tippy.js/dist/tippy.css";
import { Plugin } from "prosemirror-state";
import { Extension, type CommandProps } from "@tiptap/core";
import Heading, { type Level } from "@tiptap/extension-heading";
import Underline from "@tiptap/extension-underline";
import Strike from "@tiptap/extension-strike";
import Code from "@tiptap/extension-code";
import HardBreak from "@tiptap/extension-hard-break";

import { MathExtension } from "@/components/math/MathExtension";
import { Tag } from "@/features/Tag";
import { NoRulesStarterKit } from "@/features/NoRulesStarterKit";

/* ---------- Base Extensions ---------- */
const BASE_EXTENSIONS = [Tag, MathExtension, Underline, Strike, Code];

/* ✅ Utility: Remove zero-width chars on paste */
export const RemoveZeroWidthChars = Extension.create({
  name: "removeZeroWidthChars",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste(view, event) {
            const text = event.clipboardData?.getData("text/plain") ?? "";
            const clean = text.replace(/[\u200B-\u200D\uFEFF]/g, "");
            view.dispatch(view.state.tr.insertText(clean));
            return true;
          },
          transformPastedHTML(html) {
            return html.replace(/[\u200B-\u200D\uFEFF]/g, "");
          },
        },
      }),
    ];
  },
});

/* ✅ Custom Heading (safe + toggles only current line) */
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    headingNoNewline: {
      toggleHeadingNoNewline: (attrs: { level: Level }) => ReturnType;
    };
  }
}

const CustomHeading = Heading.extend({
  addCommands() {
    return {
      toggleHeadingNoNewline:
        (attrs: { level: Level }) =>
        ({ chain, editor }: CommandProps) => {
          // If it's already this heading → revert to paragraph
          if (editor.isActive("heading", attrs)) {
            return chain().focus().setParagraph().run();
          }

          // ✅ Use low-level toggleNode to only affect current block
          return chain()
            .focus()
            .toggleNode("paragraph", "heading", attrs)
            .run();
        },
    };
  },
});

/* ---------- Component ---------- */
interface PostEditorInnerProps {
  value: string;
  placeholder?: string;
  compact?: boolean;
  onReady?: (editor: Editor) => void;
}

export default function PostEditorInner({
  value,
  placeholder = "Start typing...",
  compact = false,
  onReady,
}: PostEditorInnerProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const tippyRef = useRef<Instance | null>(null);
  const lastSelRef = useRef<{ from: number; to: number } | null>(null);
  const [menuRefreshToggle, setMenuRefreshToggle] = useState(false);
  const [isEditorFocused, setIsEditorFocused] = useState(false);

  /* ✅ Initialize editor */
  const editor = useEditor({
    extensions: [
      NoRulesStarterKit.configure({
        heading: false,
        strike: false,
        code: false,
        hardBreak: false,
      }),
      Tag,
      MathExtension,
      Strike,
      Code,
      CustomHeading.configure({ levels: [1, 2, 3] }),
      HardBreak.configure({ keepMarks: true }),
      RemoveZeroWidthChars,
      Placeholder.configure({
        placeholder,
        showOnlyWhenEditable: true,
      }),
    ],
    content: value?.trim() || "<p></p>",
    editorProps: {
      attributes: {
        class:
          "tiptap ProseMirror w-full h-full text-base text-gray-800 dark:text-gray-200 overflow-y-auto p-2",
      },
    },
    immediatelyRender: false,
  });

  /* 🔌 Pass editor instance to parent */
  useEffect(() => {
    if (editor && onReady) onReady(editor);
  }, [editor, onReady]);

  /* ✅ Focus tracking */
  useEffect(() => {
    if (!editor) return;
    const handleFocus = () => setIsEditorFocused(true);
    const handleBlur = () => setIsEditorFocused(false);
    editor.on("focus", handleFocus);
    editor.on("blur", handleBlur);
    return () => {
      editor.off("focus", handleFocus);
      editor.off("blur", handleBlur);
    };
  }, [editor]);

  /* 🎯 Floating Menu Logic */
  useEffect(() => {
    if (!editor || !menuRef.current) return;
    let rafId: number;
    const reference = document.createElement("div");
    document.body.appendChild(reference);

    const instance = tippy(reference, {
      getReferenceClientRect: null,
      content: menuRef.current,
      trigger: "manual",
      placement: "top",
      interactive: true,
      hideOnClick: false,
      appendTo: document.body,
      zIndex: 10050,
    });

    const updateToolbarPosition = () => {
      if (!editor?.view?.dom) return;
      const sel = window.getSelection();
      const range = sel?.rangeCount ? sel.getRangeAt(0) : null;
      if (!sel || !range) return;
      const editorEl = editor.view.dom;
      const isInEditor = editorEl.contains(sel.anchorNode);
      if (!isInEditor || range.collapsed) {
        instance.hide();
        return;
      }
      const rect = range.getBoundingClientRect();
      instance.setProps({ getReferenceClientRect: () => rect });
      instance.show();
      setMenuRefreshToggle((prev) => !prev);
    };

    const debouncedUpdate = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateToolbarPosition);
    };

    editor.on("selectionUpdate", debouncedUpdate);
    editor.on("transaction", debouncedUpdate);
    document.addEventListener("selectionchange", debouncedUpdate);

    tippyRef.current = instance;

    return () => {
      cancelAnimationFrame(rafId);
      editor.off("selectionUpdate", debouncedUpdate);
      editor.off("transaction", debouncedUpdate);
      document.removeEventListener("selectionchange", debouncedUpdate);
      instance.destroy();
      document.body.removeChild(reference);
    };
  }, [editor]);

  if (!editor) return null;
  const e = editor;

  const withRestoredSelection = (
    chainOp: (chain: ReturnType<typeof e.chain>) => ReturnType<typeof e.chain>
  ) => {
    const sel = lastSelRef.current;
    let chain = e.chain().focus();
    if (sel && sel.from !== sel.to) chain = chain.setTextSelection(sel);
    chainOp(chain).run();
  };

  const headingLevels: Level[] = [1, 2, 3];

  return (
    <div className="w-full mx-auto">
      {/* Floating Toolbar */}
      <div
        ref={menuRef}
        className="flex gap-2 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-md p-1 text-black dark:text-white"
      >
        {headingLevels.map((level) => (
          <button
            key={level}
            onClick={() =>
              withRestoredSelection((c) => c.toggleHeadingNoNewline({ level }))
            }
            className={`px-2 py-1 rounded ${
              e.isActive("heading", { level })
                ? "bg-gray-200 dark:bg-gray-700"
                : "hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            H{level}
          </button>
        ))}

        <button
          onClick={() => withRestoredSelection((c) => c.toggleBold())}
          className={`px-2 py-1 rounded ${
            e.isActive("bold")
              ? "bg-gray-200 dark:bg-gray-700"
              : "hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          B
        </button>

        <button
          onClick={() => withRestoredSelection((c) => c.toggleItalic())}
          className={`px-2 py-1 rounded ${
            e.isActive("italic")
              ? "bg-gray-200 dark:bg-gray-700"
              : "hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          I
        </button>

        <button
          onClick={() => withRestoredSelection((c) => c.toggleUnderline())}
          className={`px-2 py-1 rounded ${
            e.isActive("underline")
              ? "bg-gray-200 dark:bg-gray-700"
              : "hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          U
        </button>

        <button
          onClick={() => withRestoredSelection((c) => c.toggleStrike())}
          className={`px-2 py-1 rounded ${
            e.isActive("strike")
              ? "bg-gray-200 dark:bg-gray-700"
              : "hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          S
        </button>

        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => withRestoredSelection((c) => c.toggleCode())}
          className={`px-2 py-1 rounded ${
            e.isActive("code") ? "bg-gray-200 dark:bg-gray-700" : ""
          }`}
        >
          {"</>"}
        </button>

        <button
          onClick={() => {
            const selection = window.getSelection()?.toString();
            if (!selection?.trim()) return;
            const { from, to } = e.state.selection;
            withRestoredSelection((c) =>
              c.deleteRange({ from, to }).insertMath(selection.trim())
            );
          }}
          className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          ∑
        </button>
      </div>

      {/* Editor Container */}
      <div
        className={`flex flex-col rounded-lg border transition ${
          isEditorFocused
            ? "border-black dark:border-white shadow-md"
            : "border-gray-300 dark:border-gray-500"
        }`}
      >
        <div className="flex-1 relative max-h-[300px] overflow-y-auto overflow-x-hidden">
          <EditorContent editor={editor} />
        </div>

        <div className="text-right text-xs text-gray-500 dark:text-gray-400 px-4 py-1 border-t border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-sm">
          {e.getText().length} / 280
        </div>
      </div>
    </div>
  );
}
