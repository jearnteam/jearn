"use client";

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
/* Types                                                                      */
/* -------------------------------------------------------------------------- */


export interface PostEditorWrapperRef {
  clearWithHistory: () => void;
  getHTML: () => string;
  focus: () => void;

  // 🔥 dynamic getter — NEVER stale
  editor: Editor | null;
}

interface Props {
  initialValue?: string;
  placeholder?: string;
  compact?: boolean;
  onUpdate?: () => void;
  onReady?: () => void;
  onFocus?: () => void;

  // 🔥 NEW — for JEARN link popup
  onJearnLinkDetected?: (data: {
    url: string;
    from: number;
    to: number;
  }) => void;
}

/* -------------------------------------------------------------------------- */
/* Dynamic Inner Editor                                                       */
/* -------------------------------------------------------------------------- */

const PostEditorInner = dynamic(() => import("./editor/PostEditorInner"), {
  ssr: false,
  loading: () => (
    <div className="p-4 h-[75px] rounded-xl animate-pulse bg-gray-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700" />
  ),
});

/* -------------------------------------------------------------------------- */
/* Wrapper                                                                    */
/* -------------------------------------------------------------------------- */


const PostEditorWrapper = forwardRef<PostEditorWrapperRef, Props>(
  (
    {
      placeholder,
      onUpdate,
      onReady,
      onFocus,
      onJearnLinkDetected,
    },
    ref
  ) => {
    const editorRef = useRef<Editor | null>(null);

    /* ---------------------------------------------------------------------- */
    /* Stable callback refs (avoid stale closures)                            */
    /* ---------------------------------------------------------------------- */

    const onUpdateRef = useRef(onUpdate);
    const onFocusRef = useRef(onFocus);
    const onReadyRef = useRef(onReady);
    const onJearnLinkDetectedRef = useRef(onJearnLinkDetected);

    useEffect(() => {
      onUpdateRef.current = onUpdate;
    }, [onUpdate]);

    useEffect(() => {
      onFocusRef.current = onFocus;
    }, [onFocus]);

    useEffect(() => {
      onReadyRef.current = onReady;
    }, [onReady]);

    useEffect(() => {
      onJearnLinkDetectedRef.current = onJearnLinkDetected;
    }, [onJearnLinkDetected]);

    /* ---------------------------------------------------------------------- */
    /* Imperative API                                                         */
    /* ---------------------------------------------------------------------- */

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

      // 🔥 CRITICAL: dynamic getter
      get editor() {
        return editorRef.current;
      },
    }));

    /* ---------------------------------------------------------------------- */
    /* Editor Ready                                                           */
    /* ---------------------------------------------------------------------- */

    const handleReady = (editor: Editor) => {
      editorRef.current = editor;

      /* ---------------- Focus Listener ---------------- */
      const handleEditorFocus = () => {
        onFocusRef.current?.();
      };

      /* ---------------- Update Listener ---------------- */
      const handleEditorUpdate = () => {
        onUpdateRef.current?.();
      };

      /* ---------------- Transaction Listener ---------------- */
      const handleTransaction = ({ transaction }: any) => {
        const meta = transaction.getMeta("jearnLinkDetected");
        if (meta) {
          onJearnLinkDetectedRef.current?.(meta);
        }
      };
      editor.on("transaction", ({ transaction }) => {
        const meta = transaction.getMeta("jearnLinkDetected");
        if (meta) {
          console.log("🎯 META RECEIVED:", meta);
        }
      });

      editor.on("focus", handleEditorFocus);
      editor.on("update", handleEditorUpdate);
      editor.on("transaction", handleTransaction);

      editor.on("destroy", () => {
        editor.off("focus", handleEditorFocus);
        editor.off("update", handleEditorUpdate);
        editor.off("transaction", handleTransaction);
      });

      onReadyRef.current?.();
    };


    
    /* ---------------------------------------------------------------------- */
    /* Render                                                                 */
    /* ---------------------------------------------------------------------- */

    return (
      <div
        className={clsx(
          "flex flex-col h-full rounded-lg transition"
        )}
      >
        <PostEditorInner
          placeholder={placeholder}
          onReady={handleReady}
        />
      </div>
    );
  }
);

PostEditorWrapper.displayName = "PostEditorWrapper";

export default memo(PostEditorWrapper);
