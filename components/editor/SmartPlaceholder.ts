import Placeholder from "@tiptap/extension-placeholder";
import { Editor } from "@tiptap/core";

export const SmartPlaceholder = Placeholder.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      placeholder: "Start typing...",
      showOnlyWhenEditable: true,
      showOnlyCurrent: false,
      emptyEditorClass: "is-editor-empty",

      // 👇 Smarter condition: hide placeholder when focused or has cursor, even if empty
      shouldShow: ({ editor }: { editor: Editor }) => {
        // If not editable, don't show
        if (!editor.isEditable) return false;

        // Always hide when focused — avoids the “Enter spam shows placeholder” bug
        if (editor.isFocused) return false;

        // Otherwise only show if truly empty
        const text = editor.state.doc.textContent.trim();
        if (text.length > 0) return false;

        const children = editor.state.doc.content.content;
        if (children.length > 1) return false;

        const firstNode = children[0];
        if (!firstNode) return true;

        return firstNode.content.size === 0;
      },
    };
  },
});
