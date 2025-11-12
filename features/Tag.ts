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

  // ✅ Let the DOM node control text content, don't repeat #tag in renderHTML
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
          handleKeyDown(view, event) {
            const isSpace = event.key === " ";
            const isEnter = event.key === "Enter";
            if (!isSpace && !isEnter) return false;

            const { state, dispatch } = view;
            const { $from, empty } = state.selection;

            // === Case 1: Cursor is inside an existing tag mark -> split it cleanly ===
            if (empty) {
              const insideRange = getMarkRange($from, type);
              if (insideRange) {
                const splitPos = $from.pos;
                const tr = state.tr;

                const node = $from.parent;
                const nodeStart = $from.start();
                const offset = $from.parentOffset;
                const fullText = node.textContent;

                const leftText = fullText.slice(0, offset); // still part of tag
                const rightText = fullText.slice(offset); // plain text

                // Remove original full text
                tr.delete(nodeStart, nodeStart + fullText.length);

                // Insert left-side shortened link
                if (leftText.length > 0) {
                  const newTag = leftText.slice(1); // remove leading '#'
                  tr.insert(
                    nodeStart,
                    state.schema.text(leftText, [type.create({ tag: newTag })])
                  );
                }

                let cursorPos = nodeStart + leftText.length;

                // Insert the right-side plain text
                if (rightText.length > 0) {
                  tr.insert(cursorPos, state.schema.text(rightText));
                }

                // Space or Enter behavior
                if (isSpace) {
                  tr.insertText(" ", cursorPos);
                  cursorPos += 1;
                } else if (isEnter) {
                  tr.split(cursorPos);
                }

                tr.setSelection(TextSelection.create(tr.doc, cursorPos));
                tr.removeStoredMark(type); // prevent leaking blue marks

                dispatch(tr);
                event.preventDefault();
                return true;
              }
            }

            // === Case 2: Create a tag from raw "#word" right before the cursor ===
            const textBefore = $from.parent.textBetween(
              0,
              $from.parentOffset,
              undefined,
              "\uFFFC"
            );

            // Match the last "#word" before cursor
            const match = textBefore.match(/#([\p{L}\p{N}_]+)$/u);
            if (!match) return false;

            const [fullHashtag, tagValue] = match;
            const hashtagStart = $from.pos - fullHashtag.length;

            const tr = state.tr;

            // Remove raw "#tag"
            tr.delete(hashtagStart, $from.pos);

            // Insert marked text
            const tagNode = state.schema.text(`#${tagValue}`, [
              type.create({ tag: tagValue }),
            ]);
            tr.insert(hashtagStart, tagNode);

            const afterTagPos = hashtagStart + tagNode.nodeSize;

            if (isSpace) {
              const nextChar = tr.doc.textBetween(
                afterTagPos,
                afterTagPos + 1,
                undefined,
                "\uFFFC"
              );
              if (nextChar !== " ") tr.insertText(" ", afterTagPos);
              tr.setSelection(TextSelection.create(tr.doc, afterTagPos + 1));
            } else if (isEnter) {
              tr.split(afterTagPos);
            }

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
