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
import { ImagePlaceholder } from "@/features/ImagePlaceholder";

import { Extension } from "@tiptap/core";
import { useTranslation } from "react-i18next";

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
const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF]/g;

function countCharactersWithMath(doc: any) {
  let count = 0;
  let paragraphIndex = -1;

  doc.descendants((node: any) => {
    // Count paragraphs for newline logic
    if (node.type?.name === "paragraph") {
      paragraphIndex++;

      // Clean paragraph content
      const clean = node.textContent.replace(ZERO_WIDTH_REGEX, "");

      // ❌ Do NOT count the first empty paragraph
      if (paragraphIndex === 0) {
        return true; // skip it
      }

      // ✔ Count empty paragraphs after first one = newline
      if (clean.length === 0) {
        count += 1;
      }

      return true;
    }

    // ✔ HardBreak = user pressed Enter
    if (node.type?.name === "hardBreak") {
      count += 1;
      return false;
    }

    // ✔ Tag node = count full "#value"
    if (node.type?.name === "tag") {
      const val = (node.attrs?.value || "").replace(ZERO_WIDTH_REGEX, "");
      count += `#${val}`.length;
      return false;
    }

    // ✔ Math node = count LaTeX length
    if (node.type?.name === "math") {
      const latex = (node.attrs?.latex || "").replace(ZERO_WIDTH_REGEX, "");
      count += latex.length;
      return false;
    }

    // ✔ Normal text
    if (node.isText) {
      const clean = node.text.replace(ZERO_WIDTH_REGEX, "");
      count += clean.length;
    }

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
  placeholder,
  onReady,
}: PostEditorInnerProps) {
  const { t } = useTranslation();

  const finalPlaceholder =
    placeholder ??
    (t("placeholder") || "Type in what you wanna share with everyone");

  const menuRef = useRef<HTMLDivElement>(null);
  const tippyRef = useRef<Instance | null>(null);
  const lastSelRef = useRef<{ from: number; to: number } | null>(null);

  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [, forceRerender] = useState({});

  /* ------------------------- EDITOR INIT -------------------------- */
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
      ImagePlaceholder,
      MathExtension,
      RemoveZeroWidthChars,
      Placeholder.configure({
        placeholder: finalPlaceholder,
      }),
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
        "data-placeholder": finalPlaceholder,
      },
    },

    onUpdate: ({ editor }) => {
      setCharCount(countCharactersWithMath(editor.state.doc));
    },

    immediatelyRender: false,
  });

  /* Editor ready */
  useEffect(() => {
    if (editor && onReady) onReady(editor);
  }, [editor, onReady]);

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

  /* Selection tracking */
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
      maxWidth: "none", // ⭐ allow full width, don't shrink box
    });

    const update = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return instance.hide();

      const range = sel.getRangeAt(0);
      if (range.collapsed) return instance.hide();

      instance.setProps({
        getReferenceClientRect: () => range.getBoundingClientRect(),
      });

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
            onClick={() =>
              withRestore((c) =>
                c.setHeadingLevel({
                  level: lv,
                })
              )
            }
            className={`shrink-0 px-3 py-1.5 rounded-md font-semibold text-sm transition
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
          className={`shrink-0 px-3 py-1.5 rounded-md font-semibold text-sm transition
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
          className={`shrink-0 px-3 py-1.5 rounded-md italic font-semibold text-sm transition
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
          className={`shrink-0 px-3 py-1.5 rounded-md underline font-semibold text-sm transition
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
          className={`shrink-0 px-3 py-1.5 rounded-md line-through font-semibold text-sm transition
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
          className={`shrink-0 px-3 py-1.5 rounded-md font-mono text-sm transition
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
          className="shrink-0 px-3 py-1.5 rounded-md transition text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          ∑
        </button>
        <button
          onClick={async () => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";

            input.onchange = async () => {
              const file = input.files?.[0];
              if (!file) return;

              // upload image → get ID
              const form = new FormData();
              form.append("file", file);

              const res = await fetch("/api/images/uploadImage", {
                method: "POST",
                body: form,
              });

              const { id } = await res.json();

              // insert placeholder block
              withRestore((c) => c.insertImagePlaceholder(id));
            };

            input.click();
          }}
          className="shrink-0 px-3 py-1.5 rounded-md transition text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          🖼️
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
