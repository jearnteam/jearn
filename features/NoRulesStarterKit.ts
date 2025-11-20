import { Extension, InputRule } from "@tiptap/core";

export const NoRulesStarterKit = Extension.create({
  name: "noRulesStarter",

  addInputRules() {
    return [
      new InputRule({
        find: /---$/,
        handler: ({ range, chain }) => {
          // IMPORTANT: chain() THEN commands
          chain()
            .deleteRange(range)
            .setHorizontalRule()
            .run();

          // MUST return void
          return;
        },
      }),
    ];
  },
});
