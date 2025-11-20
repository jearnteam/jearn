"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";

import Placeholder from "@tiptap/extension-placeholder";

import tippy, { type Instance } from "tippy.js";
import "tippy.js/dist/tippy.css";

import { Plugin, PluginKey } from "prosemirror-state";

import Underline from "@tiptap/extension-underline";
import Strike from "@tiptap/extension-strike";
import Code from "@tiptap/extension-code";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Heading from "@tiptap/extension-heading";
import HardBreak from "@tiptap/extension-hard-break";
import HorizontalRule from "@tiptap/extension-horizontal-rule";

import { MathExtension } from "@/components/math/MathExtension";
import { Tag } from "@/features/Tag";

import { NoRulesStarterKit } from "@/features/NoRulesStarterKit";
import { HeadingPatch } from "@/features/HeadingPatch";
import type { Level } from "@tiptap/extension-heading";

import { Extension } from "@tiptap/core";

/* ----------------------- ZERO WIDTH REMOVAL ----------------------- */
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

/* ------------------------ CHARACTER COUNT ------------------------ */
function countCharactersWithMath(doc: any) {
  let count = 0;

  doc.descendants((node: any) => {
    if (node.type?.name === "math") {
      count += (node.attrs?.latex || "").length;
      return false;
    }
    if (node.isText) {
      count += node.text.replace(/\u200B/g, "").length;
    }
    return true;
  });

  return count;
}

const MAX_CHARS = 20000;

export const TextLimitPlugin = new Plugin({
  key: new PluginKey("textLimit"),
  filterTransaction(tr) {
    const nextDoc = tr.doc;
    const count = countCharactersWithMath(nextDoc);
    return count <= MAX_CHARS;
  },
});

/**
 * Notion-style Enter:
 * - Inside heading → split, then next block = paragraph
 * - In other blocks → let default behavior handle it
 */
const SafeHeadingEnterFix = Extension.create({
  name: "safeHeadingEnterFix",

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { $from } = editor.state.selection;

        // Only intercept Enter inside a heading
        if ($from.parent.type.name !== "heading") return false;

        return editor
          .chain()
          .focus()
          .splitBlock() // create the new empty block
          .insertContent("<p></p>") // replace heading’s new block with paragraph
          .run();
      },
    };
  },
});

/* ----------------------------- COMPONENT ----------------------------- */

interface PostEditorInnerProps {
  value: string;
  placeholder?: string;
  compact?: boolean;
  onReady?: (editor: Editor) => void;
}

export default function PostEditorInner({
  value,
  placeholder = "Start typing...",
  onReady,
}: PostEditorInnerProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const tippyRef = useRef<Instance | null>(null);
  const lastSelRef = useRef<{ from: number; to: number } | null>(null);

  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const editor = useEditor({
    extensions: [
      // Schema
      Document,
      Paragraph,
      Text,

      // Headings + custom behavior
      Heading.configure({ levels: [1, 2, 3] }),
      HeadingPatch, // /h1, /h2, /h3 + setHeadingLevel
      HorizontalRule,

      // Shift+Enter hard break (optional, Notion-like)
      HardBreak.configure({ keepMarks: true }),

      // HR input rule, no Enter override
      NoRulesStarterKit,

      // Notion-style Enter inside headings
      SafeHeadingEnterFix,

      // Marks
      Bold,
      Italic,
      Underline,
      Strike,
      Code,

      // Custom nodes / extensions
      Tag,
      MathExtension,
      RemoveZeroWidthChars,

      // Placeholder
      Placeholder.configure({ placeholder }),

      // Character limit plugin
      Extension.create({
        name: "limitExtension",
        addProseMirrorPlugins() {
          return [TextLimitPlugin];
        },
      }),
    ],

    content: value?.trim() || "<p></p>",

    editorProps: {
      attributes: {
        class:
          "tiptap ProseMirror w-full h-full text-base text-gray-800 dark:text-gray-200 overflow-y-auto p-2",
      },
    },

    onUpdate: ({ editor }) => {
      setCharCount(countCharactersWithMath(editor.state.doc));
    },

    immediatelyRender: false,
  });

  /* Pass editor upward */
  useEffect(() => {
    if (editor && onReady) onReady(editor);
  }, [editor, onReady]);

  /* Focus state */
  useEffect(() => {
    if (!editor) return;
    const f = () => setIsEditorFocused(true);
    const b = () => setIsEditorFocused(false);
    editor.on("focus", f);
    editor.on("blur", b);
    return () => {
      editor.off("focus", f);
      editor.off("blur", b);
    };
  }, [editor]);

  /* Track selection */
  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const { from, to } = editor.state.selection;
      lastSelRef.current = { from, to };
    };

    editor.on("selectionUpdate", update);
    editor.on("transaction", update);

    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  /* Floating toolbar */
  useEffect(() => {
    if (!editor || !menuRef.current) return;

    let raf: number;
    const el = document.createElement("div");
    document.body.appendChild(el);

    const instance = tippy(el, {
      getReferenceClientRect: null,
      content: menuRef.current,
      trigger: "manual",
      placement: "top",
      interactive: true,
      appendTo: document.body,
      hideOnClick: false,
      zIndex: 20000,
    });

    const update = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return instance.hide();
      const range = sel.getRangeAt(0);
      if (range.collapsed) return instance.hide();
      instance.setProps({
        getReferenceClientRect: () => range.getBoundingClientRect(),
      });
      instance.show();
    };

    const debounced = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    editor.on("selectionUpdate", debounced);
    editor.on("transaction", debounced);
    document.addEventListener("selectionchange", debounced);

    tippyRef.current = instance;

    return () => {
      cancelAnimationFrame(raf);
      editor.off("selectionUpdate", debounced);
      editor.off("transaction", debounced);
      document.removeEventListener("selectionchange", debounced);
      instance.destroy();
      document.body.removeChild(el);
    };
  }, [editor]);

  if (!editor) return null;

  /* Restore selection for toolbar actions */
  const withRestore = (fn: (chain: any) => any) => {
    let chain = editor.chain().focus();
    if (lastSelRef.current) {
      chain = chain.setTextSelection(lastSelRef.current);
    }
    fn(chain).run();
  };

  const levels: Level[] = [1, 2, 3];

  return (
    <div className="w-full mx-auto">
      {/* Floating Toolbar */}
      <div
        ref={menuRef}
        className="flex gap-2 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-md p-1"
      >
        {levels.map((lv) => (
          <button
            key={lv}
            onClick={() =>
              withRestore((c) =>
                c.setHeadingLevel({
                  level: lv,
                })
              )
            }
            className={`px-2 py-1 rounded ${
              editor.isActive("heading", { level: lv })
                ? "bg-gray-200 dark:bg-gray-700"
                : "hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            H{lv}
          </button>
        ))}

        <button
          onClick={() => withRestore((c) => c.toggleBold())}
          className={`px-2 py-1 rounded ${
            editor.isActive("bold")
              ? "bg-gray-200 dark:bg-gray-700"
              : "hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          B
        </button>

        <button
          onClick={() => withRestore((c) => c.toggleItalic())}
          className={`px-2 py-1 rounded ${
            editor.isActive("italic")
              ? "bg-gray-200 dark:bg-gray-700"
              : "hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          I
        </button>

        <button
          onClick={() => withRestore((c) => c.toggleUnderline())}
          className={`px-2 py-1 rounded ${
            editor.isActive("underline")
              ? "bg-gray-200 dark:bg-gray-700"
              : "hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          U
        </button>

        <button
          onClick={() => withRestore((c) => c.toggleStrike())}
          className={`px-2 py-1 rounded ${
            editor.isActive("strike")
              ? "bg-gray-200 dark:bg-gray-700"
              : "hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          S
        </button>

        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => withRestore((c) => c.toggleCode())}
          className={`px-2 py-1 rounded ${
            editor.isActive("code")
              ? "bg-gray-200 dark:bg-gray-700"
              : "hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          {"</>"}
        </button>

        <button
          onClick={() => {
            const sel = window.getSelection()?.toString();
            if (!sel?.trim()) return;
            const { from, to } = editor.state.selection;
            withRestore((c) =>
              c.deleteRange({ from, to }).insertMath(sel.trim())
            );
          }}
          className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          ∑
        </button>
      </div>

      {/* Editor */}
      <div
        className={`flex flex-col rounded-lg border transition ${
          isEditorFocused
            ? "border-black dark:border-white shadow-md"
            : "border-gray-300 dark:border-gray-500"
        }`}
      >
        <div className="flex-1 relative max-h-[300px] overflow-y-auto">
          <EditorContent editor={editor} />
        </div>

        <div
          className={`text-right text-xs px-4 py-1 border-t ${
            charCount >= MAX_CHARS
              ? "text-red-500"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {charCount} / {MAX_CHARS}
        </div>
      </div>
    </div>
  );
}
