"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { ChainedCommands } from "@tiptap/core";
import { useTranslation } from "react-i18next";
import tippy, { type Instance } from "tippy.js";
import "tippy.js/dist/tippy.css";
import "@/lib/prism";
import clsx from "clsx";

import { buildExtensions } from "./extensions";
import { countCharactersWithMath, MAX_CHARS } from "./characterCount";
import { buildFloatingMenuActions } from "./FLOATING_MENU_ACTIONS";

interface PostEditorInnerProps {
  value?: string;
  placeholder?: string;
  onReady?: (editor: Editor) => void;
}

export default function PostEditorInner({
  value,
  placeholder,
  onReady,
}: PostEditorInnerProps) {
  const { t } = useTranslation();
  const finalPlaceholder = placeholder ?? t("placeholder");

  const [linkPopup, setLinkPopup] = useState<{
    url: string;
    from: number;
    to: number;
  } | null>(null);

  const [linkMode, setLinkMode] = useState<"card" | "link">("card");
  const [linkText, setLinkText] = useState("");

  const menuRef = useRef<HTMLDivElement>(null);
  const tippyRef = useRef<Instance | null>(null);
  const lastSelRef = useRef<{ from: number; to: number } | null>(null);

  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [, forceRerender] = useState({});
  const [isMobile, setIsMobile] = useState(false);

  const extensions = useMemo(
    () => buildExtensions(finalPlaceholder),
    [finalPlaceholder]
  );

  const editor = useEditor(
    {
      extensions,
      content: "<p></p>",
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

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (editor && onReady) onReady(editor);
  }, [editor, onReady]);

  useEffect(() => {
    if (!editor) return;
    requestAnimationFrame(() => {
      setCharCount(countCharactersWithMath(editor.state.doc));
    });
  }, [editor]);

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

  const withRestore = (fn: (c: ChainedCommands) => ChainedCommands) => {
    if (!editor) return;

    let chain = editor.chain().focus();

    if (lastSelRef.current) {
      const { from, to } = lastSelRef.current;
      chain = chain.setTextSelection({ from, to });
    }

    fn(chain).run();
  };

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

      const editorDom = editor.view.dom;
      const isInsideEditor =
        anchorNode === editorDom || editorDom.contains(anchorNode);

      if (!isInsideEditor || !editor.isFocused) {
        instance.hide();
        return;
      }

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

  const FLOATING_MENU_ACTIONS = buildFloatingMenuActions();

  const toolBtn =
    "h-9 min-w-[36px] px-2 flex items-center justify-center rounded-md text-sm font-medium transition select-none touch-manipulation";

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
              title={action.shortcut ?? "No shortcut"}
              className={`${toolBtn} ${
                active
                  ? "bg-black text-white dark:bg-white dark:text-black shadow"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {action.label}

              {action.id === "clear" ? (
                <span className="ml-1 px-1 rounded text-[10px] opacity-60 bg-black/10 dark:bg-white/10 font-mono">
                  \
                </span>
              ) : (
                index < 10 && (
                  <span className="ml-1 px-1 rounded text-[10px] opacity-60 bg-black/10 dark:bg-white/10">
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
          {/* MOBILE TOOLBAR */}
          {isMobile && editor && (
            <div className="sticky bottom-0 bg-white dark:bg-neutral-900 border-t dark:border-gray-700">
              <div
                className="
        flex items-center gap-2
        overflow-x-auto overflow-y-hidden
        whitespace-nowrap
        px-2 pt-3 pb-4
        scrollbar-thin
      "
              >
                {FLOATING_MENU_ACTIONS.map((action) => {
                  const active = action.isActive?.(editor) ?? false;

                  return (
                    <button
                      key={action.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        action.run(editor, withRestore);
                      }}
                      title={action.shortcut ?? "No shortcut"}
                      aria-label={action.shortcut ?? action.label}
                      className={clsx(
                        "h-9 min-w-[40px] shrink-0 px-2 rounded-md text-sm font-medium",
                        active
                          ? "bg-black text-white dark:bg-white dark:text-black"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                      )}
                    >
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
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
