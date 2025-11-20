import { Extension, InputRule } from "@tiptap/core";

export const NoRulesStarterKit = Extension.create({
  name: "noRulesStarter",

  addInputRules() {
    return [
      new InputRule({
        find: /---$/,
        handler: ({ range, chain }) => {
          chain()
            .deleteRange(range)
            .insertContent("<hr>")
            .createParagraphNear()
            .run();
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { $from } = editor.state.selection;

        // 🚫 Don't handle Enter inside heading
        if ($from.parent.type.name === "heading") {
          return false;   // let TipTap handle correctly
        }

        // HR behavior stays
        const before = $from.nodeBefore;
        const after = $from.nodeAfter;

        if (
          before?.type.name === "horizontalRule" ||
          after?.type.name === "horizontalRule"
        ) {
          return editor.commands.insertContent("<p></p>");
        }

        // Default fallback (lists/code/etc)
        return editor.commands.first(({ commands }) => [
          () => commands.newlineInCode(),
          () => commands.createParagraphNear(),
          () => commands.liftEmptyBlock(),
          () => commands.insertContent("<br>"),
        ]);
      },
    };
  },
});
