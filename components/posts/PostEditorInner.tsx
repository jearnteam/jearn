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

/* ----------------------- ZERO WIDTH ----------------------- */
export const RemoveZeroWidthChars = Extension.create({
  name: "removeZeroWidthChars",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste(view, event) {
            const clean = event.clipboardData
              ?.getData("text/plain")
              ?.replace(/[\u200B-\u200D\uFEFF]/g, "");
            view.dispatch(view.state.tr.insertText(clean || ""));
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

/* ----------------------- CHARACTER LIMIT ----------------------- */
function countCharactersWithMath(doc: any) {
  let count = 0;
  doc.descendants((node: any) => {
    if (node.type?.name === "math") {
      count += (node.attrs?.latex || "").length;
      return false;
    }
    if (node.isText) count += node.text.length;
    return true;
  });
  return count;
}

const MAX_CHARS = 20000;

export const TextLimitPlugin = new Plugin({
  key: new PluginKey("textLimit"),
  filterTransaction(tr) {
    return countCharactersWithMath(tr.doc) <= MAX_CHARS;
  },
});

/* ----------------------- NOTION Enter ----------------------- */
const SafeHeadingEnterFix = Extension.create({
  name: "safeHeadingEnterFix",
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { $from } = editor.state.selection;
        if ($from.parent.type.name !== "heading") return false;

        return editor.chain().focus().splitBlock().setNode("paragraph").run();
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
  const [, forceRerender] = useState({}); // <--- 🔥 forces toolbar re-render

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Heading.configure({ levels: [1, 2, 3] }),
      HeadingPatch,
      HorizontalRule,
      SafeHeadingEnterFix,
      HardBreak.configure({ keepMarks: true }),
      NoRulesStarterKit,
      Bold,
      Italic,
      Underline,
      Strike,
      Code,
      Tag,
      MathExtension,
      RemoveZeroWidthChars,
      Placeholder.configure({ placeholder }),
      Extension.create({
        name: "limitPlugin",
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

  /* Editor ready callback */
  useEffect(() => {
    if (editor && onReady) onReady(editor);
  }, [editor]);

  /* Focus */
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

  /* Track selection for restore */
  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const { from, to } = editor.state.selection;
      lastSelRef.current = { from, to };
      forceRerender({}); // <--- force floating menu UI update
    };

    editor.on("selectionUpdate", update);
    editor.on("transaction", update);

    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  /* Floating menu */
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

      // FIXED — TypeScript-safe
      instance.setContent(menuRef.current!);

      instance.show();
    };

    const deb = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    editor.on("selectionUpdate", deb);
    editor.on("transaction", deb);
    document.addEventListener("selectionchange", deb);

    tippyRef.current = instance;

    return () => {
      cancelAnimationFrame(raf);
      editor.off("selectionUpdate", deb);
      editor.off("transaction", deb);
      document.removeEventListener("selectionchange", deb);
      instance.destroy();
      document.body.removeChild(el);
    };
  }, [editor]);

  if (!editor) return null;

  /* Restore selection */
  const withRestore = (fn: (c: any) => any) => {
    let c = editor.chain().focus();
    if (lastSelRef.current) {
      c = c.setTextSelection(lastSelRef.current);
    }
    fn(c).run();
  };

  const levels: Level[] = [1, 2, 3];

  return (
    <div className="w-full mx-auto">
      {/* Floating Toolbar */}
      <div
        ref={menuRef}
        className="flex gap-2 bg-white dark:bg-neutral-900 border border-gray-300 
             dark:border-gray-700 rounded-xl shadow-lg p-2 backdrop-blur-md"
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
            className={`px-3 py-1.5 rounded-md font-semibold text-sm transition
        ${
          editor.isActive("heading", { level: lv })
            ? "bg-black text-white dark:bg-white dark:text-black shadow"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
        }`}
          >
            H{lv}
          </button>
        ))}

        <button
          onClick={() => withRestore((c) => c.toggleBold())}
          className={`px-3 py-1.5 rounded-md font-semibold text-sm transition
      ${
        editor.isActive("bold")
          ? "bg-black text-white dark:bg-white dark:text-black shadow"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
      }`}
        >
          B
        </button>

        <button
          onClick={() => withRestore((c) => c.toggleItalic())}
          className={`px-3 py-1.5 rounded-md italic font-semibold text-sm transition
      ${
        editor.isActive("italic")
          ? "bg-black text-white dark:bg-white dark:text-black shadow"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
      }`}
        >
          I
        </button>

        <button
          onClick={() => withRestore((c) => c.toggleUnderline())}
          className={`px-3 py-1.5 rounded-md underline font-semibold text-sm transition
      ${
        editor.isActive("underline")
          ? "bg-black text-white dark:bg-white dark:text-black shadow"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
      }`}
        >
          U
        </button>

        <button
          onClick={() => withRestore((c) => c.toggleStrike())}
          className={`px-3 py-1.5 rounded-md line-through font-semibold text-sm transition
      ${
        editor.isActive("strike")
          ? "bg-black text-white dark:bg-white dark:text-black shadow"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
      }`}
        >
          S
        </button>

        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => withRestore((c) => c.toggleCode())}
          className={`px-3 py-1.5 rounded-md font-mono text-sm transition
      ${
        editor.isActive("code")
          ? "bg-black text-white dark:bg-white dark:text-black shadow"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
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
          className="px-3 py-1.5 rounded-md transition
      text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
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
