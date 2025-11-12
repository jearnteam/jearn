import StarterKit from "@tiptap/starter-kit";
import HardBreak from "@tiptap/extension-hard-break";
import { InputRule } from "@tiptap/core";

/**
 * Custom StarterKit:
 * - Lets you type `---` anywhere to insert <hr>
 * - Keeps normal list behavior
 * - Fixes Enter near <hr>
 */
export const NoRulesStarterKit = StarterKit.extend({
  addInputRules() {
    const hrInputRule = new InputRule({
      find: /---$/,
      handler: ({ range, chain }) => {
        chain()
          .deleteRange(range)
          .insertContent("<hr>")
          .createParagraphNear()
          .run();

        // ✅ No return value → satisfies (void | null)
      },
    });

    return [hrInputRule];
  },

  addKeyboardShortcuts() {
    const parentShortcuts = this.parent?.() ?? {};
    return {
      ...parentShortcuts,
      Enter: ({ editor }) => {
        const { $from } = editor.state.selection;
        const nodeBefore = $from.nodeBefore;
        const nodeAfter = $from.nodeAfter;

        if (
          nodeBefore?.type.name === "horizontalRule" ||
          nodeAfter?.type.name === "horizontalRule"
        ) {
          return editor.commands.insertContent("<p></p>");
        }

        return editor.commands.first(({ commands }) => [
          () => commands.newlineInCode(),
          () => commands.createParagraphNear(),
          () => commands.liftEmptyBlock(),
          () => commands.insertContent("<br>"),
        ]);
      },
    };
  },
}).configure({
  paragraph: {},
  hardBreak: { keepMarks: true },
  heading: { levels: [1, 2, 3] },
  bulletList: {},
  orderedList: {},
  listItem: {},
  horizontalRule: {},
});
