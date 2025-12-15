// features/ImagePlaceholder.ts
import { Node, mergeAttributes } from "@tiptap/core";

export const ImagePlaceholder = Node.create({
  name: "imagePlaceholder",

  // make it inline atom so it plays nicely inside paragraphs
  priority: 2000,
  inline: true,
  group: "inline",
  atom: true,

  addAttributes() {
    return {
      id: { default: null },
      // optional fields kept for future compatibility
      url: { default: null },
      width: { default: null },
      height: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "img[data-type='image-placeholder']",
        getAttrs: (node: any) => ({
          id: node.getAttribute("data-id"),
          url: node.getAttribute("src"),
          width: node.getAttribute("data-width")
            ? Number(node.getAttribute("data-width"))
            : null,
          height: node.getAttribute("data-height")
            ? Number(node.getAttribute("data-height"))
            : null,
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { id, url, width, height } = HTMLAttributes;

    // --- ADJUST THIS if your backend/CDN requires different URL shape ---
    // prefer absolute CDN if available, otherwise local API route:

    return [
      "img",
      mergeAttributes({
        src: url,
        "data-type": "image-placeholder",
        "data-id": id,
        "data-width": width,
        "data-height": height,
        style:
          "max-width:100%; height:auto; max-height:400px; display:block; margin:auto; border-radius:8px;",
        contenteditable: "false",
      }),
    ];
  },

  addCommands() {
    return {
      // keep single-arg API (id) to match your current upload handler
      insertImagePlaceholder:
        (id: string, url?: string, width?: number, height?: number) =>
        ({ chain }: { chain: any }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: { id, url, width, height },
            })
            .run();
        },
    };
  },
});
