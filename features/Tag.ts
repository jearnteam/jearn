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

  /* -------------------------------------------------------------------------- */
  /*                                ATTRIBUTES                                  */
  /* -------------------------------------------------------------------------- */
  addAttributes() {
    return {
      value: {
        default: "",
        // support both old and new HTML
        parseHTML: (el: HTMLElement) =>
          el.getAttribute("data-value") ?? el.getAttribute("value") ?? "",
        renderHTML: (attrs: { value: string }) => ({
          "data-value": attrs.value,
        }),
      },
    };
  },

  /* -------------------------------------------------------------------------- */
  /*                                 PARSE HTML                                 */
  /* -------------------------------------------------------------------------- */
  parseHTML() {
    // keep compatibility with your existing posts
    return [{ tag: "a[data-type='tag']" }];
  },

  /* -------------------------------------------------------------------------- */
  /*                               RENDER HTML                                  */
  /* -------------------------------------------------------------------------- */
  renderHTML({ node }) {
    const value = node.attrs.value as string;

    return [
      "a",
      {
        "data-type": "tag",
        "data-value": value,
        href: `/tags/${value}`,
        target: "_blank",
        rel: "noopener noreferrer",
        class:
          "hashtag-tag text-blue-600 dark:text-blue-400 cursor-pointer hover:underline select-none",
      },
      `#${value}`,
    ];
  },

  /* -------------------------------------------------------------------------- */
  /*                                 NODE VIEW                                  */
  /* -------------------------------------------------------------------------- */
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("a");

      const value = node.attrs.value as string;

      dom.dataset.type = "tag";
      dom.dataset.value = value;
      dom.href = `/tags/${value}`;
      dom.target = "_blank";
      dom.rel = "noopener noreferrer";
      dom.textContent = `#${value}`;
      dom.className =
        "hashtag-tag text-blue-600 dark:text-blue-400 cursor-pointer hover:underline select-none";

      dom.addEventListener("click", (e) => {
        e.preventDefault();
        window.open(`/tags/${value}`, "_blank");
      });

      return { dom };
    };
  },

  /* -------------------------------------------------------------------------- */
  /*                          PROSEMIRROR PLUGIN (SAFE)                         */
  /* -------------------------------------------------------------------------- */
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: tagPluginKey,

        props: {
          /* ----------------------------------------------- */
          /*   BACKSPACE → delete whole tag before cursor    */
          /* ----------------------------------------------- */
          handleKeyDown(view: EditorView, event: KeyboardEvent) {
            if (event.key !== "Backspace") return false;

            const { state } = view;
            const { selection } = state;

            if (!selection.empty) return false;

            const before = selection.$from.nodeBefore;

            if (before?.type.name === "tag") {
              event.preventDefault();
              const tr = state.tr.delete(
                selection.$from.pos - before.nodeSize,
                selection.$from.pos
              );
              view.dispatch(tr);
              return true;
            }

            return false;
          },

          /* ----------------------------------------------- */
          /*   "#tag␣" → <tag value="tag"> + normal space    */
          /* ----------------------------------------------- */
          handleTextInput(
            view: EditorView,
            from: number,
            _to: number,
            text: string
          ) {
            // we only care when user types a space
            if (text !== " ") return false;

            const { state } = view;
            const $from = state.doc.resolve(from);

            // text before cursor in this block
            const beforeText = $from.parent.textBetween(
              0,
              $from.parentOffset,
              undefined,
              "\uFFFC" // separator for nodes
            );

            // match a word starting with # at the end
            const match = beforeText.match(/#([\p{L}\p{N}_]+)$/u);
            if (!match) return false;

            const tagValue = match[1];
            const fullMatch = `#${tagValue}`;
            const start = from - fullMatch.length; // where "#" starts

            const { tr, schema } = state;
            const tagNode = schema.nodes.tag.create({ value: tagValue });

            // delete "#tag" text
            let nextTr = tr.delete(start, from);
            // insert tag node
            nextTr = nextTr.insert(start, tagNode);
            // insert a NORMAL space after tag
            nextTr = nextTr.insert(
              start + tagNode.nodeSize,
              schema.text(" ")
            );
            // move cursor after that space
            nextTr = nextTr.setSelection(
              TextSelection.create(
                nextTr.doc,
                start + tagNode.nodeSize + 1
              )
            );

            view.dispatch(nextTr);
            return true;
          },
        },
      }),
    ];
  },
});
