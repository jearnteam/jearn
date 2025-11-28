import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";

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
        ({ state, dispatch, view }) => {
          const clean = value.replace(/[^A-Za-z0-9_]/g, "");
          const { tr, schema } = state;
          const { from, to } = state.selection;

          if (from !== to) tr.delete(from, to);

          const pos = tr.selection.from;

          const tagNode = schema.nodes.tag.create({ value: clean });
          const spacer = schema.text("\u200B");

          tr.insert(pos, tagNode);
          tr.insert(pos + 1, spacer);

          const target = pos + 2;
          tr.setSelection(TextSelection.create(tr.doc, target));

          dispatch?.(tr);

          // ⭐ FIX cursor collapsing inside tag atom
          setTimeout(() => {
            if (!view) return;
            view.focus();

            const sel = window.getSelection();
            const dom = view.domAtPos(target);

            if (sel && dom.node) {
              sel.removeAllRanges();
              const range = document.createRange();
              range.setStart(dom.node, dom.offset ?? 0);
              range.collapse(true);
              sel.addRange(range);
            }
          }, 0);

          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: tagPluginKey,

        props: {
          handleClick(view, pos) {
            const $pos = view.state.doc.resolve(pos);
            const before = $pos.nodeBefore;

            if (before?.type.name === "tag") {
              const tr = view.state.tr.insertText("\u200B", pos);
              tr.setSelection(TextSelection.create(tr.doc, pos + 1));
              view.dispatch(tr);
              view.focus();
              return true;
            }
            return false;
          },

          handleKeyDown(view, event) {
            if (event.key !== "Backspace") return false;

            const { $from } = view.state.selection;
            const nodeBefore = $from.nodeBefore;

            if (nodeBefore?.type.name === "tag") {
              event.preventDefault();
              const tr = view.state.tr.delete(
                $from.pos - nodeBefore.nodeSize,
                $from.pos
              );
              view.dispatch(tr);
              return true;
            }
            return false;
          },

          handleTextInput(view, from, _to, text) {
            if (text !== " ") return false;

            const $from = view.state.doc.resolve(from);

            const before = $from.parent.textBetween(
              0,
              $from.parentOffset,
              undefined,
              "\uFFFC"
            );

            const match = before.match(/#([\p{L}\p{N}_]+)$/u);
            if (!match) return false;

            const tagValue = match[1];
            const full = `#${tagValue}`;
            const start = from - full.length;

            const tr = view.state.tr;
            tr.delete(start, from);

            const tagNode = view.state.schema.nodes.tag.create({
              value: tagValue,
            });
            const spacer = view.state.schema.text("\u200B");

            tr.insert(start, tagNode);
            tr.insert(start + 1, spacer);

            tr.setSelection(TextSelection.create(tr.doc, start + 2));

            view.dispatch(tr);

            // ⭐ SAME FIX
            setTimeout(() => {
              const sel = window.getSelection();
              const dom = view.domAtPos(start + 2);
              if (sel && dom.node) {
                sel.removeAllRanges();
                const range = document.createRange();
                range.setStart(dom.node, dom.offset ?? 0);
                range.collapse(true);
                sel.addRange(range);
              }
            }, 0);

            return true;
          },
        },
      }),
    ];
  },
});
