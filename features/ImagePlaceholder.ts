import { Node, mergeAttributes } from "@tiptap/core";

export const ImagePlaceholder = Node.create({
  name: "imagePlaceholder",

  group: "block",
  atom: true,

  addAttributes() {
    return {
      id: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-type='image-placeholder']",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(
        {
          "data-type": "image-placeholder",
          "data-id": HTMLAttributes.id,
          class:
            "image-placeholder-block w-full my-4 py-4 bg-gray-200 dark:bg-neutral-800 text-center text-sm text-gray-600 dark:text-gray-400 rounded-md",
        },
        HTMLAttributes
      ),
      "📷 Image Uploaded",
    ];
  },

  addCommands() {
    return {
      insertImagePlaceholder:
        (id: string) =>
        ({ chain }: { chain: any }) => {
          return chain().insertContent({
            type: this.name,
            attrs: { id },
          });
        },
    };
  },
});
