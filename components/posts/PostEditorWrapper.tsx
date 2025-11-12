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
  focus: () => void; // ✅ Add focus() method
}

interface Props {
  value: string;
  placeholder?: string;
  compact?: boolean;
}

const PostEditorInner = dynamic(() => import("./PostEditorInner"), {
  ssr: false,
  loading: () => (
    <div className="p-4 h-64 rounded-lg animate-pulse bg-white dark:bg-neutral-900 border" />
  ),
});

const PostEditorWrapper = forwardRef<PostEditorWrapperRef, Props>(
  ({ value, placeholder = "Start typing...", compact = false }, ref) => {
    const editorRef = useRef<Editor | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    // ✅ Expose editor controls to parent via ref
    useImperativeHandle(ref, () => ({
      getHTML() {
        return editorRef.current?.getHTML() ?? "<p></p>";
      },
      clearEditor() {
        editorRef.current?.commands.clearContent(true);
      },
      focus() {
        // Be safe in case editor isn't mounted yet
        requestAnimationFrame(() => {
          editorRef.current?.commands.focus("end");
        });
      },
    }));

    const handleReady = (editor: Editor) => {
      editorRef.current = editor;
    };

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
          "flex flex-col h-full overflow-hidden rounded-lg transition",
        )}
      >
        <PostEditorInner
          value={value}
          placeholder={placeholder}
          compact={compact}
          onReady={handleReady}
        />
      </div>
    );
  }
);

export default memo(PostEditorWrapper);
