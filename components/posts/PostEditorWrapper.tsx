import dynamic from "next/dynamic";
import {
  memo,
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
} from "react";
import clsx from "clsx";
import type { Editor } from "@tiptap/react";

export interface PostEditorWrapperRef {
  clearEditor: () => void;
  getHTML: () => string;
  focus: () => void;
}

interface Props {
  value: string;
  placeholder?: string;
  compact?: boolean;
  onUpdate?: () => void;
}

const PostEditorInner = dynamic(() => import("./PostEditorInner"), {
  ssr: false,
  loading: () => (
    <div className="p-4 h-[75] rounded-xl animate-pulse bg-gray-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700" />
  ),
});

const PostEditorWrapper = forwardRef<PostEditorWrapperRef, Props>(
  ({ value, placeholder = "Start typing...", compact = false, onUpdate }, ref) => {
    const editorRef = useRef<Editor | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    useImperativeHandle(ref, () => ({
      getHTML() {
        return editorRef.current?.getHTML() ?? "<p></p>";
      },
      clearEditor() {
        editorRef.current?.commands.clearContent(true);
      },
      focus() {
        requestAnimationFrame(() => {
          editorRef.current?.commands.focus("end");
        });
      },
    }));

    const handleReady = (editor: Editor) => {
      editorRef.current = editor;

      editor.on("create", () => {
        const dom = editor.view.dom;

        // ⭐ REAL USER INPUT ONLY — using beforeinput with safe inputTypes
        dom.addEventListener("beforeinput", (e: InputEvent) => {
          const type = e.inputType;

          // These ONLY happen during user edits (never on focus)
          const allowed = [
            "insertText",
            "deleteContentBackward",
            "deleteContentForward",
            "insertFromPaste",
            "insertParagraph",
          ];

          if (allowed.includes(type)) {
            onUpdate?.();
          }
        });
      });
    };

    // focus detection (unchanged)
    useEffect(() => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      const handleFocusIn = () => setIsFocused(true);
      const handleFocusOut = (event: FocusEvent) => {
        if (!wrapper.contains(event.relatedTarget as Node)) {
          setIsFocused(false);
        }
      };

      wrapper.addEventListener("focusin", handleFocusIn);
      wrapper.addEventListener("focusout", handleFocusOut);

      return () => {
        wrapper.removeEventListener("focusin", handleFocusIn);
        wrapper.removeEventListener("focusout", handleFocusOut);
      };
    }, []);

    return (
      <div
        ref={wrapperRef}
        className={clsx(
          "flex flex-col h-full overflow-hidden rounded-lg transition"
        )}
      >
        <PostEditorInner
          value={value}
          placeholder={placeholder}
          onReady={handleReady}
        />
      </div>
    );
  }
);

export default memo(PostEditorWrapper);
