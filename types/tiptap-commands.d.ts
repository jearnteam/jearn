// types/tiptap-commands.d.ts
import "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imagePlaceholder: {
      insertImagePlaceholder: (
        id: string,
        ext?: string,
        width?: number,
        height?: number
      ) => ReturnType;
    };
  }
}
