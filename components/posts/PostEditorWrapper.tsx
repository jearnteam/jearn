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

function ensureSafeEnding(html: string): string {
  if (!html) return "<p></p>";

  let clean = html.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();

  // If content ends with inline atom (math/tag/image/code/etc)
  if (
    clean.endsWith("</span>") || // math or tag
    clean.endsWith("/>") || // images
    clean.endsWith("</code>") ||
    clean.endsWith("</strong>") ||
    clean.endsWith("</em>") ||
    clean.endsWith("</mark>")
  ) {
    clean += "<p></p>";
  }

  // If there is no ending paragraph at all → force it
  if (!clean.match(/<p[^>]*>.*<\/p>\s*$/)) {
    clean += "<p></p>";
  }

  return clean;
}

function removeAllZWSP(html: string): string {
  if (!html) return "<p></p>";
  return html.replace(/[\u200B-\u200D\uFEFF]/g, "");
}

export interface PostEditorWrapperRef {
  clearEditor: () => void;
  getHTML: () => string;
  focus: () => void;
  editor: Editor | null;
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
  ({ value, placeholder, compact = false, onUpdate }, ref) => {
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
      editor: editorRef.current,
    }));

    const handleReady = (editor: Editor) => {
      editorRef.current = editor;

      // 🔥 Reliable event for detecting actual document changes
      editor.on("update", () => {
        onUpdate?.();
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
          value={removeAllZWSP(ensureSafeEnding(value))}
          placeholder={placeholder}
          onReady={handleReady}
        />
      </div>
    );
  }
);

PostEditorWrapper.displayName = "PostEditorWrapper";

export default memo(PostEditorWrapper);
