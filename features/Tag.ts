import { Node } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

export const tagPluginKey = new PluginKey("tag-handler");

export const Tag = Node.create({
  name: "tag",

  inline: true,
  group: "inline",
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      value: {
        default: "",
        parseHTML: (el: HTMLElement) =>
          el.getAttribute("data-value") ?? "",
        renderHTML: (attrs) => ({
          "data-value": attrs.value,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "a[data-type='tag']" }];
  },

  renderHTML({ node }) {
    const value = node.attrs.value as string;

    return [
      "a",
      {
        "data-type": "tag",
        "data-value": value,
        // ❌ NO href
        class:
          "hashtag-tag text-blue-600 dark:text-blue-400 cursor-pointer hover:underline select-none",
      },
      `#${value}`,
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("a");
      const value = node.attrs.value as string;

      dom.dataset.type = "tag";
      dom.dataset.value = value;
      dom.textContent = `#${value}`;
      dom.className =
        "hashtag-tag text-blue-600 dark:text-blue-400 cursor-pointer hover:underline select-none";

      // ❌ NO window.open
      dom.onclick = (e) => e.preventDefault();

      return { dom };
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: tagPluginKey,
        props: {
          handleKeyDown(view: EditorView, event: KeyboardEvent) {
            if (event.key !== "Backspace") return false;

            const { selection } = view.state;
            if (!selection.empty) return false;

            const before = selection.$from.nodeBefore;
            if (before?.type.name === "tag") {
              event.preventDefault();
              view.dispatch(
                view.state.tr.delete(
                  selection.$from.pos - before.nodeSize,
                  selection.$from.pos
                )
              );
              return true;
            }

            return false;
          },

          handleTextInput(view, from, _to, text) {
            if (text !== " ") return false;

            const { state } = view;
            const $from = state.doc.resolve(from);
            const beforeText = $from.parent.textBetween(
              0,
              $from.parentOffset,
              undefined,
              "\uFFFC"
            );

            const match = beforeText.match(/#(?![_]+$)([\p{L}\p{N}_]+)$/u);
            if (!match) return false;

            const value = match[1];
            const start = from - value.length - 1;

            const tagNode = state.schema.nodes.tag.create({ value });

            let tr = state.tr.delete(start, from);
            tr = tr.insert(start, tagNode);
            tr = tr.insert(start + tagNode.nodeSize, state.schema.text(" "));
            tr = tr.setSelection(
              TextSelection.create(tr.doc, start + tagNode.nodeSize + 1)
            );

            view.dispatch(tr);
            return true;
          },
        },
      }),
    ];
  },
});
