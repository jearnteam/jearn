"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import tippy, { type Instance } from "tippy.js";
import "tippy.js/dist/tippy.css";
import { Plugin, PluginKey } from "prosemirror-state";
import { Extension, type CommandProps } from "@tiptap/core";
import Heading, { type Level } from "@tiptap/extension-heading";
import Underline from "@tiptap/extension-underline";
import Strike from "@tiptap/extension-strike";
import Code from "@tiptap/extension-code";
import HardBreak from "@tiptap/extension-hard-break";

import { MathExtension } from "@/components/math/MathExtension";
import { Tag } from "@/features/Tag";
import { NoRulesStarterKit } from "@/features/NoRulesStarterKit";

/* -------------------------------------------------------------------------- */
/*                    1. Remove Zero-Width Characters                         */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/*                          2. Count Characters w/ LaTeX                      */
/* -------------------------------------------------------------------------- */
function countCharactersWithMath(doc: any) {
  let count = 0;

  doc.descendants((node: any) => {
    // Math node → count full latex
    if (node.type?.name === "math") {
      const latex = node.attrs?.latex || "";
      count += latex.length;
      return false;
    }

    // Normal text
    if (node.isText) {
      const clean = node.text.replace(/\u200B/g, "");
      count += clean.length;
    }

    return true;
  });

  return count;
}

/* -------------------------------------------------------------------------- */
/*                         3. 2000 Character Limit Plugin                     */
/* -------------------------------------------------------------------------- */

const MAX_CHARS = 20000;

export const TextLimitPlugin = new Plugin({
  key: new PluginKey("textLimit"),
  filterTransaction(tr, state) {
    // 🔥 get the "next" doc directly
    const newDoc = tr.doc;

    const countAfter = countCharactersWithMath(newDoc);
    if (countAfter > MAX_CHARS) {
      return false; // block
    }
    return true;
  },
});


/* -------------------------------------------------------------------------- */
/*                         4. Custom Heading Toggles                          */
/* -------------------------------------------------------------------------- */
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
        (attrs) =>
        ({ chain, editor }) => {
          if (editor.isActive("heading", attrs)) {
            return chain().focus().setParagraph().run();
          }
          return chain()
            .focus()
            .toggleNode("paragraph", "heading", attrs)
            .run();
        },
    };
  },
});

/* -------------------------------------------------------------------------- */
/*                               5. Component                                 */
/* -------------------------------------------------------------------------- */

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

  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [charCount, setCharCount] = useState(0);

  /* -------------------------------------------------------------------------- */
  /*                             Initialize Editor                              */
  /* -------------------------------------------------------------------------- */
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

      /* 🔥 Add hard limit plugin */
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

    immediatelyRender: false,

    /* 🔥 Update character counter */
    onUpdate({ editor }) {
      const doc = editor.state.doc;
      setCharCount(countCharactersWithMath(doc));
    },
  });

  /* Pass editor to parent */
  useEffect(() => {
    if (editor && onReady) onReady(editor);
  }, [editor]);

  /* Focus tracking */
  useEffect(() => {
    if (!editor) return;
    const focus = () => setIsEditorFocused(true);
    const blur = () => setIsEditorFocused(false);
    editor.on("focus", focus);
    editor.on("blur", blur);
    return () => {
      editor.off("focus", focus);
      editor.off("blur", blur);
    };
  }, [editor]);

  /* -------------------------------------------------------------------------- */
  /*                            Floating Toolbar Logic                           */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    if (!editor || !menuRef.current) return;

    let rafId: number;
    const refEl = document.createElement("div");
    document.body.appendChild(refEl);

    const instance = tippy(refEl, {
      getReferenceClientRect: null,
      content: menuRef.current,
      trigger: "manual",
      placement: "top",
      interactive: true,
      hideOnClick: false,
      appendTo: document.body,
      zIndex: 20000,
    });

    const updatePosition = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;

      const range = sel.getRangeAt(0);
      const isCollapsed = range.collapsed;

      if (isCollapsed) {
        instance.hide();
        return;
      }

      const rect = range.getBoundingClientRect();
      instance.setProps({ getReferenceClientRect: () => rect });
      instance.show();
    };

    const debounced = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updatePosition);
    };

    editor.on("selectionUpdate", debounced);
    editor.on("transaction", debounced);
    document.addEventListener("selectionchange", debounced);

    tippyRef.current = instance;

    return () => {
      cancelAnimationFrame(rafId);
      editor.off("selectionUpdate", debounced);
      editor.off("transaction", debounced);
      document.removeEventListener("selectionchange", debounced);
      instance.destroy();
      document.body.removeChild(refEl);
    };
  }, [editor]);

  if (!editor) return null;
  const e = editor;

  const withRestoredSelection = (
    fn: (chain: ReturnType<typeof e.chain>) => ReturnType<typeof e.chain>
  ) => {
    let chain = e.chain().focus();
    const sel = lastSelRef.current;
    if (sel && sel.from !== sel.to) chain = chain.setTextSelection(sel);
    fn(chain).run();
  };

  const headingLevels: Level[] = [1, 2, 3];

  /* -------------------------------------------------------------------------- */
  /*                                  JSX                                       */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="w-full mx-auto">
      {/* Floating toolbar */}
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

      {/* Editor */}
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

        {/* Character Counter */}
        <div
          className={`text-right text-xs px-4 py-1 border-t border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-sm ${
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
