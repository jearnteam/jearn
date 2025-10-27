import { Mark, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

// 🔹 helper function outside of Mark.create
function applyTagIfMatch(view: EditorView, triggerText: string): boolean {
  const { state } = view;
  const $pos = state.selection.$from;
  const textBefore = $pos.doc.textBetween(0, $pos.pos, "\n", "\n");
  const match = textBefore.match(/#([A-Za-z0-9_]+)$/);

  if (match) {
    const tag = match[1];
    const start = $pos.pos - tag.length - 1;
    const end = $pos.pos;

    const tr = state.tr
      .deleteRange(start, end)
      .insertText(`#${tag}`)
      .addMark(
        start,
        start + tag.length + 1,
        state.schema.marks["tag"].create({ tag })
      );

    if (triggerText === " ") {
      view.dispatch(tr.insertText(" "));
      return true;
    } else if (triggerText === "\n") {
      view.dispatch(tr);
      return false; // let enter proceed
    }
  }
  return false;
}

export const Tag = Mark.create({
  name: "tag",
  inclusive: false,

  addAttributes() {
    return {
      tag: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-tag]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-tag": HTMLAttributes.tag,
        class: "hashtag-tag",
      }),
      `#${HTMLAttributes.tag}`,
    ];
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey("tag-handler");

    return [
      new Plugin({
        key: pluginKey,
        props: {
          handleTextInput: (view, from, to, text) => {
            if (text === " ") {
              return applyTagIfMatch(view, " ");
            }
            return false;
          },
          handleKeyDown: (view, event) => {
            if (event.key === "Enter") {
              const tagged = applyTagIfMatch(view, "\n");
              return tagged ? false : false;
            }
            return false;
          },
        },
      }),
    ];
  },
});
