import type { Editor } from "@tiptap/react";
import type { ChainedCommands } from "@tiptap/core";

export type FloatingMenuAction = {
  id: string;
  label: string;
  shortcut?: string;
  isActive?: (editor: Editor) => boolean;
  run: (editor: Editor, withRestore: any) => void;
};

export function buildFloatingMenuActions(): FloatingMenuAction[] {
  return [
    {
      id: "h1",
      label: "H1",
      shortcut: "Header 1\nCtrl/Cmd + Alt + 1",
      isActive: (e) => e.isActive("heading", { level: 1 }),
      run: (_, withRestore) =>
        withRestore((c: ChainedCommands) =>
          c.toggleHeading({ level: 1 })
        ),
    },
    {
      id: "h2",
      label: "H2",
      shortcut: "Header 2\nCtrl/Cmd + Alt + 2",
      isActive: (e) => e.isActive("heading", { level: 2 }),
      run: (_, withRestore) =>
        withRestore((c: ChainedCommands) =>
          c.toggleHeading({ level: 2 })
        ),
    },
    {
      id: "h3",
      label: "H3",
      shortcut: "Header 3\nCtrl/Cmd + Alt + 3",
      isActive: (e) => e.isActive("heading", { level: 3 }),
      run: (_, withRestore) =>
        withRestore((c: ChainedCommands) =>
          c.toggleHeading({ level: 3 })
        ),
    },
    {
      id: "bold",
      label: "B",
      shortcut: "Bold\nCtrl/Cmd + Alt + 4",
      isActive: (e) => e.isActive("bold"),
      run: (_, withRestore) =>
        withRestore((c: ChainedCommands) => c.toggleBold()),
    },
    {
      id: "italic",
      label: "I",
      shortcut: "Italic\nCtrl/Cmd + Alt + 5",
      isActive: (e) => e.isActive("italic"),
      run: (_, withRestore) =>
        withRestore((c: ChainedCommands) => c.toggleItalic()),
    },
    {
      id: "underline",
      label: "U",
      shortcut: "Underline\nCtrl/Cmd + Alt + 6",
      isActive: (e) => e.isActive("underline"),
      run: (_, withRestore) =>
        withRestore((c: ChainedCommands) => c.toggleUnderline()),
    },
    {
      id: "strike",
      label: "S",
      shortcut: "Strike\nCtrl/Cmd + Alt + 7",
      isActive: (e) => e.isActive("strike"),
      run: (_, withRestore) =>
        withRestore((c: ChainedCommands) => c.toggleStrike()),
    },
    {
      id: "bullet",
      label: "•",
      shortcut: "Bullet-List\nCtrl/Cmd + Alt + 8",
      isActive: (e) => e.isActive("bulletList"),
      run: (_, withRestore) =>
        withRestore((c: ChainedCommands) => c.toggleBulletList()),
    },
    {
      id: "quote",
      label: "❝",
      shortcut: "Quote\nCtrl/Cmd + Alt + 9",
      isActive: (e) => e.isActive("blockquote"),
      run: (_, withRestore) =>
        withRestore((c: ChainedCommands) => c.toggleBlockquote()),
    },
    {
      id: "code",
      label: "</>",
      shortcut: "Code\nCtrl/Cmd + Alt + 0",
      isActive: (e) => e.isActive("code"),
      run: (_, withRestore) =>
        withRestore((c: ChainedCommands) => c.toggleCode()),
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
}
