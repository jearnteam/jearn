import type { Editor } from "@tiptap/react";

export type FloatingMenuAction = {
  id: string;
  label: string;
  isActive?: (editor: Editor) => boolean;
  requiresSelection?: boolean;
  run: (editor: Editor) => void;
};

// ⚠️ ORDER HERE = UI ORDER = SHORTCUT ORDER
export const FLOATING_MENU_ACTIONS: FloatingMenuAction[] = [
  {
    id: "h1",
    label: "H1",
    isActive: (e) => e.isActive("heading", { level: 1 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: "h2",
    label: "H2",
    isActive: (e) => e.isActive("heading", { level: 2 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "h3",
    label: "H3",
    isActive: (e) => e.isActive("heading", { level: 3 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },

  {
    id: "bold",
    label: "B",
    requiresSelection: true,
    isActive: (e) => e.isActive("bold"),
    run: (e) => e.chain().focus().toggleBold().run(),
  },
  {
    id: "italic",
    label: "I",
    requiresSelection: true,
    isActive: (e) => e.isActive("italic"),
    run: (e) => e.chain().focus().toggleItalic().run(),
  },
  {
    id: "underline",
    label: "U",
    requiresSelection: true,
    isActive: (e) => e.isActive("underline"),
    run: (e) => e.chain().focus().toggleUnderline().run(),
  },
  {
    id: "strike",
    label: "S",
    requiresSelection: true,
    isActive: (e) => e.isActive("strike"),
    run: (e) => e.chain().focus().toggleStrike().run(),
  },

  {
    id: "bullet",
    label: "•",
    isActive: (e) => e.isActive("bulletList"),
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    id: "quote",
    label: "❝",
    isActive: (e) => e.isActive("blockquote"),
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "code",
    label: "</>",
    requiresSelection: true,
    isActive: (e) => e.isActive("code"),
    run: (e) => e.chain().focus().toggleCode().run(),
  },

  {
    id: "math",
    label: "∑",
    requiresSelection: true,
    run: (editor) => {
      const sel = window.getSelection()?.toString();
      if (!sel?.trim()) return;
      editor.chain().focus().insertMath(sel.trim()).run();
    },
  },
];
