import { Extension } from "@tiptap/core";
import { FLOATING_MENU_ACTIONS } from "@/components/posts/FloatingMenuActions";

export const FloatingMenuIndexedShortcuts = Extension.create({
  name: "floatingMenuIndexedShortcuts",

  addKeyboardShortcuts() {
    const editor = this.editor;

    const runIndex = (index: number) => {
      const action = FLOATING_MENU_ACTIONS[index];
      if (!action) return false;

      if (action.requiresSelection && editor.state.selection.empty) {
        return false;
      }

      action.run(editor);
      return true;
    };

    return {
      "Mod-Alt-1": () => runIndex(0),
      "Mod-Alt-2": () => runIndex(1),
      "Mod-Alt-3": () => runIndex(2),
      "Mod-Alt-4": () => runIndex(3),
      "Mod-Alt-5": () => runIndex(4),
      "Mod-Alt-6": () => runIndex(5),
      "Mod-Alt-7": () => runIndex(6),
      "Mod-Alt-8": () => runIndex(7),
      "Mod-Alt-9": () => runIndex(8),
      "Mod-Alt-0": () => runIndex(9),
      "Mod-m": () => runIndex(10),
    };
  },
});
