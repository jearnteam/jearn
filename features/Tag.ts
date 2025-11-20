import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";

export const tagPluginKey = new PluginKey("tag-node");

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
  selectable: true,

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
        "data-value": HTMLAttributes.value,
        href: `/tags/${HTMLAttributes.value}`,
        target: "_blank",                  // ALWAYS OPEN NEW TAB
        rel: "noopener noreferrer",
        class:
          "hashtag-tag text-blue-600 dark:text-blue-400 font-medium cursor-pointer hover:underline",
      }),
      `#${HTMLAttributes.value}`,
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const tag = node.attrs.value;
      const dom = document.createElement("a");

      dom.dataset.type = "tag";
      dom.dataset.value = tag;
      dom.href = `/tags/${tag}`;
      dom.target = "_blank";                     // ALWAYS NEW TAB
      dom.rel = "noopener noreferrer";
      dom.textContent = `#${tag}`;
      dom.className =
        "hashtag-tag text-blue-600 dark:text-blue-400 font-medium cursor-pointer hover:underline select-none";

      // Force new tab on left-click too
      dom.addEventListener("click", (e) => {
        e.preventDefault();                      // Stop default navigation
        window.open(`/tags/${tag}`, "_blank");   // FORCE NEW TAB
      });

      // Middle click → opens new tab automatically
      dom.addEventListener("auxclick", (e) => {
        if (e.button === 1) {
          window.open(`/tags/${tag}`, "_blank");
        }
      });

      return { dom };
    };
  },

  addCommands() {
    return {
      insertTag:
        (value: string) =>
        ({ state, dispatch, view }) => {
          const clean = value.replace(/[^A-Za-z0-9_]/g, "");
          const { tr, schema } = state;
          const pos = tr.selection.from;

          const node = schema.nodes.tag.create({ value: clean });
          const spacer = schema.text("\u200B");

          tr.insert(pos, node);
          tr.insert(pos + 1, spacer);
          tr.setSelection(TextSelection.create(tr.doc, pos + 2));

          if (dispatch) dispatch(tr);

          setTimeout(() => {
            if (view) {
              view.focus();
              const sel = window.getSelection();
              const domAtPos = view.domAtPos(pos + 2);

              if (sel && domAtPos.node) {
                sel.removeAllRanges();
                const range = document.createRange();
                range.setStart(domAtPos.node, domAtPos.offset ?? 0);
                range.collapse(true);
                sel.addRange(range);
              }
            }
          }, 0);

          return true;
        },
    };
  },

  /* Auto-detect #tag when typing */
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: tagPluginKey,
        props: {
          handleTextInput(view, from, _to, text) {
            if (text !== " ") return false;

            const { state } = view;
            const $from = state.doc.resolve(from);

            const textBefore = $from.parent.textBetween(
              0,
              $from.parentOffset,
              undefined,
              "\uFFFC"
            );

            const match = textBefore.match(/#([\p{L}\p{N}_]+)$/u);
            if (!match) return false;

            const tagValue = match[1];
            const full = `#${tagValue}`;
            const start = from - full.length;

            const tr = state.tr;

            tr.delete(start, from);

            const node = state.schema.nodes.tag.create({ value: tagValue });
            const spacer = state.schema.text("\u200B");

            tr.insert(start, node);
            tr.insert(start + 1, spacer);

            tr.insert(start + 2, state.schema.text(" "));

            tr.setSelection(TextSelection.create(tr.doc, start + 3));

            view.dispatch(tr);
            return true;
          },
        },
      }),
    ];
  },
});
