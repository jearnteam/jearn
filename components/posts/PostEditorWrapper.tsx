import dynamic from "next/dynamic";
import {
  memo,
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
} from "react";
import clsx from "clsx";
import type { Editor } from "@tiptap/react";

/* -------------------------------------------------------------------------- */
/* Utilities                                                                  */
/* -------------------------------------------------------------------------- */

function ensureSafeEnding(html: string): string {
  if (!html) return "<p></p>";

  let clean = html.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();

  if (
    clean.endsWith("</span>") ||
    clean.endsWith("/>") ||
    clean.endsWith("</code>") ||
    clean.endsWith("</strong>") ||
    clean.endsWith("</em>") ||
    clean.endsWith("</mark>")
  ) {
    clean += "<p></p>";
  }

  if (!clean.match(/<p[^>]*>.*<\/p>\s*$/)) {
    clean += "<p></p>";
  }

  return clean;
}

function removeAllZWSP(html: string): string {
  return html.replace(/[\u200B-\u200D\uFEFF]/g, "");
}

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface PostEditorWrapperRef {
  clearWithHistory: () => void;
  getHTML: () => string;
  focus: () => void;

  // ✅ IMPORTANT: dynamic getter (see useImperativeHandle)
  editor: Editor | null;
}

interface Props {
  initialValue?: string;
  placeholder?: string;
  compact?: boolean;
  onUpdate?: () => void;
  onReady?: () => void;
  onFocus?: () => void;
}

/* -------------------------------------------------------------------------- */
/* Dynamic Inner Editor                                                       */
/* -------------------------------------------------------------------------- */

const PostEditorInner = dynamic(() => import("./PostEditorInner"), {
  ssr: false,
  loading: () => (
    <div className="p-4 h-[75] rounded-xl animate-pulse bg-gray-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700" />
  ),
});

/* -------------------------------------------------------------------------- */
/* Wrapper                                                                    */
/* -------------------------------------------------------------------------- */

const PostEditorWrapper = forwardRef<PostEditorWrapperRef, Props>(
  ({ initialValue, placeholder, onUpdate, onReady, onFocus }, ref) => {
    const editorRef = useRef<Editor | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const initializedRef = useRef(false);

    // ✅ stable callbacks stored in refs (so listeners always call latest)
    const onUpdateRef = useRef(onUpdate);
    const onFocusRef = useRef(onFocus);
    const onReadyRef = useRef(onReady);

    useEffect(() => {
      onUpdateRef.current = onUpdate;
    }, [onUpdate]);

    useEffect(() => {
      onFocusRef.current = onFocus;
    }, [onFocus]);

    useEffect(() => {
      onReadyRef.current = onReady;
    }, [onReady]);

    useImperativeHandle(ref, () => ({
      getHTML() {
        return editorRef.current?.getHTML() ?? "<p></p>";
      },

      clearWithHistory() {
        const editor = editorRef.current;
        if (!editor) return;

        editor
          .chain()
          .command(({ tr, state }) => {
            tr.setMeta("addToHistory", true);
            tr.replaceWith(
              0,
              state.doc.content.size,
              state.schema.nodes.paragraph.create()
            );
            return true;
          })
          .run();
      },

      focus() {
        requestAnimationFrame(() => {
          editorRef.current?.commands.focus("end");
        });
      },

      // ✅ CRITICAL FIX: expose editor as getter so it is NEVER stale
      get editor() {
        return editorRef.current;
      },
    }));

    const handleReady = (editor: Editor) => {
      editorRef.current = editor;

      // ✅ initialize content ONCE
      if (!initializedRef.current && initialValue !== undefined) {
        const safe = ensureSafeEnding(removeAllZWSP(initialValue));
        editor.commands.setContent(safe, { emitUpdate: false });
        initializedRef.current = true;
      }

      const handleEditorFocus = () => {
        onFocusRef.current?.();
      };

      const handleEditorUpdate = () => {
        onUpdateRef.current?.();
      };

      editor.on("focus", handleEditorFocus);
      editor.on("update", handleEditorUpdate);

      editor.on("destroy", () => {
        editor.off("focus", handleEditorFocus);
        editor.off("update", handleEditorUpdate);
      });

      onReadyRef.current?.();
    };

    return (
      <div
        ref={wrapperRef}
        className={clsx("flex flex-col h-full rounded-lg transition")}
      >
        <PostEditorInner placeholder={placeholder} onReady={handleReady} />
      </div>
    );
  }
);

PostEditorWrapper.displayName = "PostEditorWrapper";

export default memo(PostEditorWrapper);
