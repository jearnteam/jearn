import { Code } from "@tiptap/extension-code"
import { markInputRule } from "@tiptap/core"

/**
 * Safe inline-code extension for TipTap v2
 * Fixes the bug where one character before ` is eaten
 */
export const SafeCode = Code.extend({
  name: "code",

  addInputRules() {
    return [
      markInputRule({
        find: /`([^`\s][^`]*)`$/,
        type: this.type,
      }),
    ]
  },

  addKeyboardShortcuts() {
    return {
      "Mod-e": () => this.editor.commands.toggleCode(),
    }
  },
})
