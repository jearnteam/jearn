"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { TextSelection } from "@tiptap/pm/state";
import tippy, { type Instance } from "tippy.js";
import "tippy.js/dist/tippy.css";
import "katex/dist/katex.min.css";
import { useTranslation } from "react-i18next";
import { MathExtension } from "@/components/math/MathExtension";
import { Tag } from "@/features/Tag";

// 🚫 StarterKit without default markdown input rules
const NoInputRulesStarterKit = StarterKit.extend({
  addInputRules() {
    return [];
  },
});

interface PostEditorInnerProps {
  value: string;
  onChange: (contentHtml: string) => void;
}

export default function PostEditorInner({
  value,
  onChange,
}: PostEditorInnerProps) {
  const { t, i18n } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const tippyRef = useRef<Instance | null>(null);
  const lastSelRef = useRef<{ from: number; to: number } | null>(null);

  // 📝 Initialize editor
  const editor = useEditor(
    {
      autofocus: false,
      extensions: [
        NoInputRulesStarterKit,
        Tag,
        MathExtension,
        Placeholder.configure({
          placeholder: () => t("placeholder"),
          showOnlyWhenEditable: true,
          showOnlyCurrent: false,
        }),
      ],
      content: value,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class:
            "min-h-[250px] w-full rounded-md border border-black p-3 text-base text-black focus:outline-none focus:ring-2 focus:ring-black-200",
          spellcheck: "false", // 👈 must be lowercase and string
          autocorrect: "off",
          autocapitalize: "off",
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
    },
    [i18n.language]
  ); // 👈 language as dependency

  // 🈳 Reset content when `value` becomes empty
  useEffect(() => {
    if (editor && value === "") {
      editor.commands.setContent("");
    }
  }, [value, editor]);

  // 🌐 Debug language change
  useEffect(() => {
    console.log("[🌐 LANG CHANGED]", i18n.language);
  }, [i18n.language]);

  // 🌍 Update placeholder on language change
  useEffect(() => {
    if (!editor) return;

    // 🔁 Reconfigure the Placeholder extension with the new language
    editor
      .chain()
      .command(({ tr, state }) => {
        const placeholderExtension = editor.extensionManager.extensions.find(
          (ext) => ext.name === "placeholder"
        );

        if (placeholderExtension) {
          placeholderExtension.options.placeholder = () => t("placeholder");
        }

        // 🪄 Force transaction to refresh UI
        editor.view.dispatch(tr);
        editor.commands.blur();
        setTimeout(() => editor.commands.focus(), 50);
        return true;
      })
      .run();
  }, [i18n.language, editor, t]);

  // 🪄 Initialize selection at mount
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

  // 🟦 Tag click handler
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom as HTMLElement;

    const handleClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement;
      if (target?.dataset?.tag !== undefined) {
        const tagText = target.dataset.tag;
        console.log("Clicked tag:", tagText);
        // 👉 You can route or filter posts here
      }
    };

    dom.addEventListener("click", handleClick);
    return () => dom.removeEventListener("click", handleClick);
  }, [editor]);

  // 🧰 Floating menu setup
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

  // 🪄 Restore selection helper for toolbar
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
    <div className="w-full mx-auto">
      {/* Floating Toolbar */}
      <div
        ref={menuRef}
        className="flex gap-2 bg-white border border-black rounded-md shadow-md p-1 text-black"
      >
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
        <button
          onMouseDown={preventMouseDown}
          onClick={() =>
            withRestoredSelection((c) => c.toggleHeading({ level: 2 }))
          }
          className={`px-2 py-1 rounded ${
            e.isActive("heading", { level: 2 }) ? "bg-gray-200 font-bold" : ""
          }`}
        >
          H2
        </button>
        <button
          onMouseDown={preventMouseDown}
          onClick={() =>
            withRestoredSelection((c) => c.toggleHeading({ level: 3 }))
          }
          className={`px-2 py-1 rounded ${
            e.isActive("heading", { level: 3 }) ? "bg-gray-200 font-bold" : ""
          }`}
        >
          H3
        </button>
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
            const selection = window.getSelection()?.toString();
            if (selection && selection.trim() !== "") {
              withRestoredSelection((c) => c.insertMath(selection.trim()));
            }
          }}
          className="px-2 py-1 rounded hover:bg-gray-200"
        >
          ∑
        </button>
      </div>

      {/* ✍️ The Editor */}
      <EditorContent key={i18n.language} editor={editor} />

      <div className="text-right text-sm text-gray-400 mt-1">
        {e.getText().length}/280
      </div>
    </div>
  );
}
