// components/posts/PostEditorInner.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";

import tippy, { type Instance } from "tippy.js";
import "tippy.js/dist/tippy.css";

import { Plugin, PluginKey } from "prosemirror-state";
import type { Node as ProseMirrorNode } from "prosemirror-model";

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
import { Mention } from "@/features/Mention";
import { MentionSuggestion } from "@/features/MentionSuggestion";
import { NoRulesStarterKit } from "@/features/NoRulesStarterKit";
import { ImagePlaceholder } from "@/features/ImagePlaceholder";
import { CursorExitFix } from "@/features/CursorExitFix";
import { InlineBackspaceFix } from "@/features/InlineBackspaceFix";

import { Extension, ChainedCommands } from "@tiptap/core";
import { useTranslation } from "react-i18next";
import type { Level } from "@tiptap/extension-heading";
import { AtomBoundaryFix } from "@/features/AtomBoundaryFix";
import { buildImagePlaceholderHTML } from "@/lib/insertImageHtml";

/* ----------------------- ZERO WIDTH (PASTE ONLY) ----------------------- */

const zeroWidthCleanupKey = new PluginKey("zero-width-cleanup");

const ZeroWidthCleanup = Extension.create({
  name: "zeroWidthCleanup",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: zeroWidthCleanupKey,
        props: {
          handlePaste(view, event) {
            const text = event.clipboardData?.getData("text/plain");
            if (!text) return false;

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

/* ----------------------- CHARACTER COUNT (NO HARD LIMIT) ----------------------- */

const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF]/g;

function countCharactersWithMath(doc: ProseMirrorNode) {
  let count = 0;

  doc.descendants((node: ProseMirrorNode) => {
    if (node.type?.name === "paragraph") {
      // Count paragraph as 1 (empty or not)
      count++;
      return true;
    }

    if (node.type?.name === "hardBreak") {
      count++;
      return false;
    }

    if (node.type?.name === "tag") {
      const value = (node.attrs?.value || "").replace(ZERO_WIDTH_REGEX, "");
      count += 1 + value.length; // “#tag” counts as length
      return false;
    }

    if (node.type?.name === "math") {
      const latex = (node.attrs?.latex || "").replace(ZERO_WIDTH_REGEX, "");
      count += latex.length;
      return false;
    }

    if (node.isText && typeof node.text === "string") {
      const clean = node.text.replace(ZERO_WIDTH_REGEX, "");
      count += clean.length;
    }

    return true;
  });

  // Subtract 1 ONLY IF there's anything counted
  return count > 0 ? count - 1 : 0;
}

const MAX_CHARS = 20000;

// NOTE: TextLimitPlugin is **not** used anymore to avoid the infinite recursion.
// If you want to re-enable a hard limit later, we can do it differently.
const textLimitPluginKey = new PluginKey("text-limit");

export const TextLimitPlugin = new Plugin({
  key: textLimitPluginKey,
  filterTransaction(tr, state) {
    // not used in extensions[] currently
    const doc = tr.doc || state.doc;
    return countCharactersWithMath(doc) <= MAX_CHARS;
  },
});

/* ----------------------------- COMPONENT ----------------------------- */

interface PostEditorInnerProps {
  value: string;
  placeholder?: string;
  onReady?: (editor: Editor) => void;
}

export default function PostEditorInner({
  value,
  placeholder,
  onReady,
}: PostEditorInnerProps) {
  const { t } = useTranslation();

  const finalPlaceholder =
    placeholder ??
    t("placeholder") ??
    "Type in what you wanna share with everyone";

  const menuRef = useRef<HTMLDivElement>(null);
  const tippyRef = useRef<Instance | null>(null);
  const lastSelRef = useRef<{ from: number; to: number } | null>(null);

  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [, forceRerender] = useState({});

  /* ------------------------- EXTENSIONS -------------------------- */
  const extensions = useMemo(
    () => [
      Document,
      Paragraph,
      Text,
      Heading.configure({ levels: [1, 2, 3] }),

      HorizontalRule,
      HardBreak.configure({ keepMarks: true }),

      NoRulesStarterKit,

      Bold,
      Italic,
      Underline,
      Strike,
      Code,

      Tag,
      Mention,
      MentionSuggestion,
      ImagePlaceholder,
      InlineBackspaceFix,
      AtomBoundaryFix,
      MathExtension,
      ZeroWidthCleanup,

      CursorExitFix,

      Placeholder.configure({
        placeholder: finalPlaceholder,
      }),

      // ❌ we do NOT inject TextLimitPlugin here to avoid stack overflow
      // If you want to enforce MAX_CHARS later, we'll do a safer approach.
    ],
    [finalPlaceholder]
  );

  /* ------------------------- EDITOR INIT -------------------------- */
  const editor = useEditor(
    {
      extensions,
      content: value?.trim() || "<p></p>",
      editorProps: {
        attributes: {
          class:
            "tiptap ProseMirror w-full h-full text-base text-gray-800 dark:text-gray-200 overflow-y-auto p-2",
          "data-placeholder": finalPlaceholder,
        },
      },
      onUpdate: ({ editor }) => {
        setCharCount(countCharactersWithMath(editor.state.doc));
      },
      immediatelyRender: false,
    },
    []
  );

  /* Editor ready */
  useEffect(() => {
    if (editor && onReady) onReady(editor);
  }, [editor, onReady]);

  /* INITIAL CHAR COUNT ON LOAD */
  useEffect(() => {
    if (!editor) return;

    requestAnimationFrame(() => {
      setCharCount(countCharactersWithMath(editor.state.doc));
    });
  }, [editor]);

  /* Focus handling */
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

  /* Track last selection */
  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const { from, to } = editor.state.selection;
      lastSelRef.current = { from, to };
      forceRerender({});
    };

    editor.on("selectionUpdate", update);
    editor.on("transaction", update);

    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  /* Floating menu (tippy) */
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
      maxWidth: "none",
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

  /* Restore selection for toolbar actions */
  const withRestore = (fn: (c: ChainedCommands) => ChainedCommands) => {
    let c = editor.chain().focus();

    if (lastSelRef.current) {
      const { from, to } = lastSelRef.current;
      c = c.setTextSelection({
        from: lastSelRef.current.from,
        to: lastSelRef.current.to,
      });
    }

    fn(c).run();
  };

  const levels: Level[] = [1, 2, 3];

  return (
    <div className="w-full mx-auto">
      {/* FLOATING TOOLBAR */}
      <div
        ref={menuRef}
        className="
          inline-flex flex-nowrap items-center gap-2
          whitespace-nowrap
          bg-white dark:bg-neutral-900 
          border border-gray-300 dark:border-gray-700 
          rounded-xl shadow-lg px-3 py-2 backdrop-blur-md
          min-w-[360px]
        "
      >
        {levels.map((lv) => (
          <button
            key={lv}
            onClick={() => withRestore((c) => c.toggleHeading({ level: lv }))}
            className={`shrink-0 px-3 py-1.5 rounded-md font-semibold text-sm transition
              ${
                editor.isActive("heading", { level: lv })
                  ? "bg-black text-white dark:bg-white dark:text-black shadow"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }
            `}
          >
            H{lv}
          </button>
        ))}

        <button
          onClick={() => withRestore((c) => c.toggleBold())}
          className={`shrink-0 px-3 py-1.5 rounded-md font-semibold text-sm transition
            ${
              editor.isActive("bold")
                ? "bg-black text-white dark:bg-white dark:text-black shadow"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }
          `}
        >
          B
        </button>

        <button
          onClick={() => withRestore((c) => c.toggleItalic())}
          className={`shrink-0 px-3 py-1.5 rounded-md italic font-semibold text-sm transition
            ${
              editor.isActive("italic")
                ? "bg-black text-white dark:bg-white dark:text-black shadow"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }
          `}
        >
          I
        </button>

        <button
          onClick={() => withRestore((c) => c.toggleUnderline())}
          className={`shrink-0 px-3 py-1.5 rounded-md underline font-semibold text-sm transition
            ${
              editor.isActive("underline")
                ? "bg-black text-white dark:bg-white dark:text-black shadow"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }
          `}
        >
          U
        </button>

        <button
          onClick={() => withRestore((c) => c.toggleStrike())}
          className={`shrink-0 px-3 py-1.5 rounded-md line-through font-semibold text-sm transition
            ${
              editor.isActive("strike")
                ? "bg-black text-white dark:bg-white dark:text-black shadow"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }
          `}
        >
          S
        </button>

        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => withRestore((c) => c.toggleCode())}
          className={`shrink-0 px-3 py-1.5 rounded-md font-mono text-sm transition
            ${
              editor.isActive("code")
                ? "bg-black text-white dark:bg-white dark:text-black shadow"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }
          `}
        >
          {"</>"}
        </button>

        <button
          onClick={() => {
            const sel = window.getSelection()?.toString();
            if (!sel?.trim()) return;
            withRestore((c) => c.insertMath(sel.trim()));
          }}
          className="shrink-0 px-3 py-1.5 rounded-md transition text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          ∑
        </button>
      </div>

      {/* EDITOR */}
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
