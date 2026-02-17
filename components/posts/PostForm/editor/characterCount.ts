import { Plugin, PluginKey } from "prosemirror-state";
import type { Node as ProseMirrorNode } from "prosemirror-model";

const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF]/g;

export function countCharactersWithMath(doc: ProseMirrorNode) {
  let count = 0;

  doc.descendants((node: ProseMirrorNode) => {
    if (node.type?.name === "paragraph") {
      count++;
      return true;
    }

    if (node.type?.name === "hardBreak") {
      count++;
      return false;
    }

    if (node.type?.name === "tag") {
      const value = (node.attrs?.value || "").replace(ZERO_WIDTH_REGEX, "");
      count += 1 + value.length;
      return false;
    }

    if (node.type?.name === "math") {
      const latex = (node.attrs?.latex || "").replace(ZERO_WIDTH_REGEX, "");
      count += latex.length;
      return false;
    }

    if (node.isText && typeof node.text === "string") {
      const clean = node.text.replace(ZERO_WIDTH_REGEX, "");
      count += clean.length;
    }

    return true;
  });

  return count > 0 ? count - 1 : 0;
}

export const MAX_CHARS = 20000;

const textLimitPluginKey = new PluginKey("text-limit");

export const TextLimitPlugin = new Plugin({
  key: textLimitPluginKey,
  filterTransaction(tr, state) {
    const doc = tr.doc || state.doc;
    return countCharactersWithMath(doc) <= MAX_CHARS;
  },
});
