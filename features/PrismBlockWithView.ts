// features/PrismBlockWithView.ts
import { ReactNodeViewRenderer } from "@tiptap/react";
import { PrismBlock } from "./PrismBlock";
import { PrismBlockView } from "./PrismBlockView";

export const PrismBlockWithView = PrismBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(PrismBlockView);
  },
});
