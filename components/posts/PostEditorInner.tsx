"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { TextSelection } from "@tiptap/pm/state";
import tippy, { type Instance } from "tippy.js";
import { MathExtension } from "@/components/math/MathExtension";
import "tippy.js/dist/tippy.css";
import "katex/dist/katex.min.css";
import { useTranslation } from "react-i18next";

interface PostEditorInnerProps {
  value: string;                    // ✅ added value prop
  onChange: (contentHtml: string) => void;
}

export default function PostEditorInner({ value, onChange }: PostEditorInnerProps) {
  const { t, i18n } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const tippyRef = useRef<Instance | null>(null);
  const lastSelRef = useRef<{ from: number; to: number } | null>(null);

  const editor = useEditor({
    autofocus: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      MathExtension,
      Placeholder.configure({
        placeholder: () => t("placeholder"),
        showOnlyWhenEditable: true,
        showOnlyCurrent: false,
      }),
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[120px] w-full rounded-md border border-black p-3 text-base text-black focus:outline-none focus:ring-2 focus:ring-blue-500",
      },
      handleDOMEvents: {
        pointerdown: (view) => {
          if (document.activeElement !== view.dom) view.focus();
          return false;
        },
        mousedown: (view) => {
          if (document.activeElement !== view.dom) view.focus();
          return false;
        },
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // 🧽 Reset content when parent `value` becomes empty
  useEffect(() => {
    if (editor && value === "") {
      editor.commands.clearContent();
    }
  }, [value, editor]);

  // Update placeholder when language changes
  useEffect(() => {
    if (!editor) return;
    editor.view.dispatch(editor.state.tr);
  }, [i18n.language, editor]);

  // Initialize selection
  useEffect(() => {
    if (!editor) return;
    requestAnimationFrame(() => {
      const { view } = editor;
      const tr = view.state.tr.setSelection(
        TextSelection.near(view.state.doc.resolve(0))
      );
      view.dispatch(tr);
      editor.commands.blur();
      view.dom.blur();
    });
  }, [editor]);

  // Markdown-like shortcuts
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom as HTMLElement;

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key !== " ") return;
      const { state } = editor;
      const { $from } = state.selection;
      const from = $from.start();
      const to = $from.pos;
      const raw = state.doc.textBetween(from, to, "\n", "\n");
      const chain = editor.chain().focus();

      if (/^#{1,3}$/.test(raw)) {
        ev.preventDefault();
        const level = raw.length as 1 | 2 | 3;
        chain.deleteRange({ from, to }).toggleHeading({ level }).run();
        return;
      }
      if (raw === "-") {
        ev.preventDefault();
        chain.deleteRange({ from, to }).toggleBulletList().run();
        return;
      }
      if (/^\d+\.$/.test(raw)) {
        ev.preventDefault();
        chain.deleteRange({ from, to }).toggleOrderedList().run();
        return;
      }
      if (raw === ">") {
        ev.preventDefault();
        chain.deleteRange({ from, to }).toggleBlockquote().run();
        return;
      }
    };

    dom.addEventListener("keydown", onKeyDown);
    return () => dom.removeEventListener("keydown", onKeyDown);
  }, [editor]);

  // Floating menu logic stays the same ⬇️
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

    instance.hide();
    reference.style.pointerEvents = "none";
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
      instance.setProps({ getReferenceClientRect: () => rect });
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

  if (!editor) return null;
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

  const preventMouseDown = (ev: React.MouseEvent) => ev.preventDefault();

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Floating Toolbar */}
      <div
        ref={menuRef}
        className="flex gap-2 bg-white border border-black rounded-md shadow-md p-1 text-black"
      >
        {/* same toolbar buttons... */}
        <button
          onMouseDown={preventMouseDown}
          onClick={() =>
            withRestoredSelection((c) => c.toggleHeading({ level: 1 }))
          }
          className={`px-2 py-1 rounded ${
            e.isActive("heading", { level: 1 }) ? "bg-gray-200 font-bold" : ""
          }`}
        >
          H1
        </button>
        {/* ... rest of buttons unchanged */}
      </div>

      <EditorContent editor={e} />

      <div className="text-right text-sm text-gray-400 mt-1">
        {e.getText().length}/280
      </div>
    </div>
  );
}
