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
import Link from "@tiptap/extension-link";
import BulletList from "@tiptap/extension-bullet-list";
import ListItem from "@tiptap/extension-list-item";
import Blockquote from "@tiptap/extension-blockquote";
import ListKeymap from "@tiptap/extension-list-keymap";

import { MathExtension } from "@/components/math/MathExtension";
import { Tag } from "@/features/Tag";
import { Mention } from "@/features/Mention";
import { MentionSuggestion } from "@/features/MentionSuggestion";
import { NoRulesStarterKit } from "@/features/NoRulesStarterKit";
import { ImagePlaceholder } from "@/features/ImagePlaceholder";
import { CursorExitFix } from "@/features/CursorExitFix";
import { InlineBackspaceFix } from "@/features/InlineBackspaceFix";
import { FixHeadingEnter } from "@/features/ExitHeadingOnEnter";

import { Extension, ChainedCommands } from "@tiptap/core";
import { useTranslation } from "react-i18next";
import type { Level } from "@tiptap/extension-heading";
import { AtomBoundaryFix } from "@/features/AtomBoundaryFix";
import { BackspaceExitListLikeEnter } from "@/features/BackspaceExitListLikeEnter";
import { SmartBackspaceBlockquote } from "@/features/SmartBackspaceBlockquote";
import { FloatingMenuIndexedShortcuts } from "@/features/FloatingMenuIndexedShortcuts";
import { ClearFormatting } from "@/features/ClearFormatting";
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
            const clipboard = event.clipboardData;
            if (!clipboard) return false;

            const html = clipboard.getData("text/html");

            // ✅ If HTML exists → let ProseMirror handle it
            if (html) return false;

            // 🧼 Plain-text only
            const text = clipboard.getData("text/plain");
            if (!text) return false;

            const clean = text.replace(/[\u200B-\u200D\uFEFF]/g, "");
            view.dispatch(view.state.tr.insertText(clean));
            return true;
          },

          transformPastedHTML(html) {
            // 🧼 Clean HTML but KEEP formatting
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
      Link,
      BulletList,
      ListItem,
      Blockquote,

      // behavior overrides
      FixHeadingEnter,
      ListKeymap,
      BackspaceExitListLikeEnter,
      SmartBackspaceBlockquote,
      FloatingMenuIndexedShortcuts,
      ClearFormatting,

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
      interactive: true,
      appendTo: document.body,
      hideOnClick: false,
      zIndex: 20000,
      maxWidth: "calc(100vw - 16px)",
      placement: "top",
      popperOptions: {
        modifiers: [
          {
            name: "flip",
            options: {
              fallbackPlacements: ["bottom"],
            },
          },
          {
            name: "preventOverflow",
            options: {
              padding: 8,
            },
          },
        ],
      },
    });

    const update = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        instance.hide();
        return;
      }

      const range = sel.getRangeAt(0);
      if (range.collapsed) {
        instance.hide();
        return;
      }

      const anchorNode = sel.anchorNode;
      if (!anchorNode) {
        instance.hide();
        return;
      }

      // 🔑 CRITICAL CHECK: selection must be inside THIS editor
      const editorDom = editor.view.dom;
      const isInsideEditor =
        anchorNode === editorDom || editorDom.contains(anchorNode);

      if (!isInsideEditor) {
        instance.hide();
        return;
      }

      // Optional but recommended: editor must be focused
      if (!editor.isFocused) {
        instance.hide();
        return;
      }

      // Mobile guard (your existing logic)
      if (window.matchMedia("(max-width: 640px)").matches) {
        instance.hide();
        return;
      }

      instance.setProps({
        getReferenceClientRect: () => range.getBoundingClientRect(),
      });

      instance.show();
    };

    const debouncedUpdate = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    editor.on("selectionUpdate", debouncedUpdate);
    editor.on("transaction", debouncedUpdate);
    document.addEventListener("selectionchange", debouncedUpdate);

    tippyRef.current = instance;

    return () => {
      cancelAnimationFrame(raf);
      editor.off("selectionUpdate", debouncedUpdate);
      editor.off("transaction", debouncedUpdate);
      document.removeEventListener("selectionchange", debouncedUpdate);
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
  const toolBtn =
    "h-9 min-w-[36px] px-2 flex items-center justify-center rounded-md text-sm font-medium transition select-none touch-manipulation";

  type FloatingMenuAction = {
    id: string;
    label: string;
    shortcut?: string;
    isActive?: (editor: Editor) => boolean;
    run: (editor: Editor, withRestore: any) => void;
  };

  const FLOATING_MENU_ACTIONS: FloatingMenuAction[] = [
    {
      id: "h1",
      label: "H1",
      shortcut: "Header 1\nCtrl/Cmd + Alt + 1",
      isActive: (e) => e.isActive("heading", { level: 1 }),
      run: (_, withRestore) =>
        withRestore((c: any) => c.toggleHeading({ level: 1 })),
    },
    {
      id: "h2",
      label: "H2",
      shortcut: "Header 2\nCtrl/Cmd + Alt + 2",
      isActive: (e) => e.isActive("heading", { level: 2 }),
      run: (_, withRestore) =>
        withRestore((c: any) => c.toggleHeading({ level: 2 })),
    },
    {
      id: "h3",
      label: "H3",
      shortcut: "Header 3\nCtrl/Cmd + Alt + 3",
      isActive: (e) => e.isActive("heading", { level: 3 }),
      run: (_, withRestore) =>
        withRestore((c: any) => c.toggleHeading({ level: 3 })),
    },
    {
      id: "bold",
      label: "B",
      shortcut: "Bold\nCtrl/Cmd + Alt + 4",
      isActive: (e) => e.isActive("bold"),
      run: (_, withRestore) => withRestore((c: any) => c.toggleBold()),
    },
    {
      id: "italic",
      label: "I",
      shortcut: "Italic\nCtrl/Cmd + Alt + 5",
      isActive: (e) => e.isActive("italic"),
      run: (_, withRestore) => withRestore((c: any) => c.toggleItalic()),
    },
    {
      id: "underline",
      label: "U",
      shortcut: "Underline\nCtrl/Cmd + Alt + 6",
      isActive: (e) => e.isActive("underline"),
      run: (_, withRestore) => withRestore((c: any) => c.toggleUnderline()),
    },
    {
      id: "strike",
      label: "S",
      shortcut: "Strike\nCtrl/Cmd + Alt + 7",
      isActive: (e) => e.isActive("strike"),
      run: (_, withRestore) => withRestore((c: any) => c.toggleStrike()),
    },
    {
      id: "bullet",
      label: "•",
      shortcut: "Bullet-List\nCtrl/Cmd + Alt + 8",
      isActive: (e) => e.isActive("bulletList"),
      run: (_, withRestore) => withRestore((c: any) => c.toggleBulletList()),
    },
    {
      id: "quote",
      label: "❝",
      shortcut: "Quote\nCtrl/Cmd + Alt + 9",
      isActive: (e) => e.isActive("blockquote"),
      run: (_, withRestore) => withRestore((c: any) => c.toggleBlockquote()),
    },
    {
      id: "code",
      label: "</>",
      shortcut: "Code\nCtrl/Cmd + Alt + 0",
      isActive: (e) => e.isActive("code"),
      run: (_, withRestore) => withRestore((c: any) => c.toggleCode()),
    },
    {
      id: "math",
      label: "∑",
      shortcut: "Latex\nNo shortcut",
      run: (editor) => {
        const sel = window.getSelection()?.toString();
        if (!sel?.trim()) return;
        editor.chain().focus().insertMath(sel.trim()).run();
      },
    },
    {
      id: "clear",
      label: "Tx",
      shortcut: "Clear all formats\nCtrl / Cmd + Alt + \\",
      run: (editor) =>
        editor
          .chain()
          .focus()
          .unsetAllMarks()
          .clearNodes()
          .setParagraph()
          .run(),
    },
  ];

  return (
    <div className="w-full mx-auto">
      {/* FLOATING TOOLBAR */}
      <div
        ref={menuRef}
        className="
    flex items-center gap-1
    bg-white dark:bg-neutral-900
    border border-gray-300 dark:border-gray-700
    rounded-xl shadow-lg
    px-2 py-1
    backdrop-blur-md
    max-w-full
    overflow-x-auto
    scrollbar-none
    touch-pan-x
  "
      >
        {FLOATING_MENU_ACTIONS.map((action, index) => {
          const active = action.isActive?.(editor) ?? false;
          return (
            <button
              key={action.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => action.run(editor, withRestore)}
              title={`${action.shortcut ?? "No shortcut"}`}
              className={`${toolBtn} ${
                active
                  ? "bg-black text-white dark:bg-white dark:text-black shadow"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {action.label}

              {/* shortcut index badge */}
              {action.id === "clear" ? (
                <span
                  className="
                    ml-1
                    px-1
                    rounded
                    text-[10px]
                    opacity-60
                    bg-black/10
                    dark:bg-white/10
                    font-mono
                  "
                >
                  \
                </span>
              ) : (
                index < 10 && (
                  <span
                    className="
                      ml-1
                      px-1
                      rounded
                      text-[10px]
                      opacity-60
                      bg-black/10
                      dark:bg-white/10
                    "
                  >
                    {index === 9 ? "0" : index + 1}
                  </span>
                )
              )}
            </button>
          );
        })}
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
