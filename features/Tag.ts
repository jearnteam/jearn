// @/features/Tag.ts
import { Mark, mergeAttributes, getMarkRange } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";

export const Tag = Mark.create({
  name: "tag",

  addAttributes() {
    return {
      tag: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "a[data-tag]",
        getAttrs: (el) =>
          el instanceof HTMLElement
            ? { tag: el.getAttribute("data-tag") }
            : false,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        href: `/tags/${HTMLAttributes.tag}`,
        class:
          "hashtag-tag text-blue-600 dark:text-blue-400 hover:underline cursor-pointer select-none",
      }),
    ];
  },

  addProseMirrorPlugins() {
    const type = this.type;

    return [
      new Plugin({
        key: new PluginKey("hashtag"),

        props: {
          handleKeyDown(view: any, event: KeyboardEvent) {
            const { state, dispatch } = view;
            const { $from } = state.selection;

            /* -----------------------------------------------------------
             * BREAK TAG IF SPACE IS TYPED INSIDE A TAG (#je|arn)
             * ----------------------------------------------------------- */
            if (event.key === " ") {
              const markRange = getMarkRange($from, type);

              if (markRange) {
                const tr = state.tr;

                const { from, to } = markRange;

                // 1) Insert the space
                tr.insertText(" ", $from.pos);

                // 2) Remove tag mark over ORIGINAL range
                tr.removeMark(from, to, type);

                // 3) Remove tag mark from the shifted positions as well
                tr.removeMark(from, to + 1, type); // +1 because of inserted space

                // 4) Ensure no stored tag mark leaks
                tr.removeStoredMark(type);

                // 5) Move cursor after inserted space
                tr.setSelection(TextSelection.create(tr.doc, $from.pos + 1));

                dispatch(tr);
                event.preventDefault();
                return true;
              }
            }

            /* -----------------------------------------------------------
             * 2) REMOVE TAG MARK WHEN DELETING INSIDE / ADJACENT
             * ----------------------------------------------------------- */
            if (event.key === "Backspace" || event.key === "Delete") {
              const markRange = getMarkRange($from, type);

              if (markRange) {
                const tr = state.tr;
                tr.removeMark(markRange.from, markRange.to, type);
                dispatch(tr);
                return false; // allow normal delete of characters
              }
            }

            /* -----------------------------------------------------------
             * 3) TAG CREATION: when SPACE typed after "#word"
             *    Example: "This is #jearn⎵" -> "#jearn" becomes link
             * ----------------------------------------------------------- */
            const isSpace = event.key === " ";
            if (!isSpace) return false;

            // Text before cursor within the current block
            const textBefore = $from.parent.textBetween(
              0,
              $from.parentOffset,
              undefined,
              "\uFFFC"
            );

            // Match "#word" right before cursor
            const match = textBefore.match(/#([\p{L}\p{N}_]+)$/u);
            if (!match) return false;

            const [fullHashtag, tagValue] = match;

            const hashtagEnd = $from.pos; // cursor position
            const hashtagStart = hashtagEnd - fullHashtag.length;
            if (hashtagStart < 0) return false;

            const tr = state.tr;

            // Insert the space after the hashtag
            tr.insertText(" ", hashtagEnd);

            // Add the tag mark over "#word"
            tr.addMark(
              hashtagStart,
              hashtagEnd,
              type.create({ tag: tagValue })
            );

            // Move cursor after the inserted space
            tr.setSelection(TextSelection.create(tr.doc, hashtagEnd + 1));

            // Ensure future typed text is not tagged
            tr.removeStoredMark(type);

            dispatch(tr);
            event.preventDefault();
            return true;
          },
        },
      }),
    ];
  },
});
