import { Extension } from "@tiptap/core";

export const ClearFormatting = Extension.create({
  name: "clearFormatting",

  addKeyboardShortcuts() {
    return {
      "Mod-Alt-\\": () => {
        const { editor } = this;

        editor
          .chain()
          .focus()
          .unsetAllMarks()
          .clearNodes()
          .liftListItem("listItem")
          .lift("blockquote")
          .setParagraph()
          .run();

        return true;
      },
    };
  },
});
