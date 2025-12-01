import { Node, mergeAttributes, type CommandProps } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

export const tagPluginKey = new PluginKey("tag-handler");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tag: {
      insertTag: (value: string) => ReturnType;
    };
  }
}

export const Tag = Node.create({
  name: "tag",
  group: "inline",
  inline: true,
  atom: true,
  selectable: false, // behaves like a single inline char

  addAttributes() {
    return {
      value: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "a[data-type='tag']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        "data-type": "tag",
        href: `/tags/${HTMLAttributes.value}`,
        target: "_blank",
        rel: "noopener noreferrer",
        class:
          "hashtag-tag text-blue-600 dark:text-blue-400 cursor-pointer hover:underline select-none",
      }),
      `#${HTMLAttributes.value}`,
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("a");
      dom.dataset.type = "tag";
      dom.dataset.value = node.attrs.value;
      dom.href = `/tags/${node.attrs.value}`;
      dom.target = "_blank";
      dom.rel = "noopener noreferrer";
      dom.textContent = `#${node.attrs.value}`;
      dom.className =
        "hashtag-tag text-blue-600 dark:text-blue-400 cursor-pointer hover:underline select-none";

      dom.addEventListener("click", (e) => {
        e.preventDefault();
        window.open(`/tags/${node.attrs.value}`, "_blank");
      });

      return { dom };
    };
  },

  addCommands() {
    return {
      insertTag:
        (value: string) =>
        ({ state, tr, dispatch }) => {
          const clean = value.replace(/[^A-Za-z0-9_]/g, "");
          const { schema } = state;
          const { from, to } = tr.selection;

          const tagNode = schema.nodes.tag.create({ value: clean });

          let next = tr;
          if (from !== to) next = next.delete(from, to);

          const pos = next.selection.from;

          // Insert tag
          next = next.insert(pos, tagNode);

          // ⭐ Insert an empty text node immediately after
          const emptyText = schema.text("");
          next = next.insert(pos + tagNode.nodeSize, emptyText);

          // Move caret after the empty text node
          next = next.setSelection(
            TextSelection.create(next.doc, pos + tagNode.nodeSize)
          );

          if (dispatch) dispatch(next);
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: tagPluginKey,

        props: {
          // Backspace deletes tag when caret is right after it
          handleKeyDown(view: EditorView, event: KeyboardEvent) {
            if (event.key !== "Backspace") return false;

            const { state } = view;
            const { selection } = state;
            if (!selection.empty) return false;

            const { $from } = selection;
            const before = $from.nodeBefore;

            if (before?.type.name === "tag") {
              event.preventDefault();
              const tr = state.tr.delete(
                $from.pos - before.nodeSize,
                $from.pos
              );
              view.dispatch(tr);
              return true;
            }

            return false;
          },

          // Autocomplete: "#tag " → tag node
          handleTextInput(
            view: EditorView,
            from: number,
            _to: number,
            text: string
          ) {
            if (text !== " ") return false;

            const $from = view.state.doc.resolve(from);
            const beforeText = $from.parent.textBetween(
              0,
              $from.parentOffset,
              undefined,
              "\uFFFC"
            );

            const match = beforeText.match(/#([\p{L}\p{N}_]+)$/u);
            if (!match) return false;

            const tagValue = match[1];
            const full = `#${tagValue}`;
            const start = from - full.length;

            const { state } = view;
            const { tr, schema } = state;

            const tagNode = schema.nodes.tag.create({ value: tagValue });

            let nextTr = tr.delete(start, from);
            nextTr = nextTr.insert(start, tagNode);
            const after = start + tagNode.nodeSize;

            nextTr = nextTr.setSelection(
              TextSelection.create(nextTr.doc, after)
            );

            view.dispatch(nextTr);
            return true;
          },
        },
      }),
    ];
  },
});
