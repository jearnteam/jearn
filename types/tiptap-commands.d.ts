import "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imagePlaceholder: {
      insertImagePlaceholder: (id: string) => ReturnType;
    };
  }
}
