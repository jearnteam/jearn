import { useRef, useEffect } from "react";
import type { PostEditorWrapperRef } from "@/components/posts/PostForm/PostEditorWrapper";

type FocusArea = "title" | "editor" | "none";

interface Params {
    title: string;
    setTitle: (v: string) => void;
    editorRef: React.RefObject<PostEditorWrapperRef | null>;
    titleInputRef: React.RefObject<HTMLInputElement | null>;
    editorHostRef: React.RefObject<HTMLDivElement | null>;
    saveDraftNow: (nextTitle?: string) => void;
  }

export function usePostUndo({
  title,
  setTitle,
  editorRef,
  titleInputRef,
  editorHostRef,
  saveDraftNow,
}: Params) {
  type Snapshot = { title: string; content: string };

  const titleHistoryRef = useRef<string[]>([]);
  const titleRedoRef = useRef<string[]>([]);

  const globalUndoRef = useRef<Snapshot | null>(null);
  const globalRedoRef = useRef<Snapshot | null>(null);

  const clearUndoRef = useRef<Snapshot | null>(null);
  const clearRedoRef = useRef<Snapshot | null>(null);

  const clearModeRef = useRef(false);
  const isApplyingUndoRedoRef = useRef(false);
  const lastFocusedAreaRef = useRef<FocusArea>("none");
  const suppressTitleBlurRef = useRef(false);

  const getFocusArea = (): FocusArea => {
    const active = document.activeElement;

    if (active && titleInputRef.current === active) {
      lastFocusedAreaRef.current = "title";
      return "title";
    }

    if (
      active &&
      editorHostRef.current &&
      editorHostRef.current.contains(active)
    ) {
      lastFocusedAreaRef.current = "editor";
      return "editor";
    }

    return lastFocusedAreaRef.current;
  };

  const refocus = (area: FocusArea) => {
    requestAnimationFrame(() => {
      if (area === "title") {
        const input = titleInputRef.current;
        if (!input) return;

        suppressTitleBlurRef.current = true;
        input.focus();
        const len = input.value.length;
        input.setSelectionRange(len, len);

        requestAnimationFrame(() => {
          suppressTitleBlurRef.current = false;
        });
      }

      if (area === "editor") {
        editorRef.current?.focus();
      }
    });
  };

  const handleUndo = () => {
    const area = getFocusArea();

    if (area === "none") {
      if (!globalUndoRef.current) return;

      const snap = globalUndoRef.current;
      globalUndoRef.current = null;

      globalRedoRef.current = {
        title,
        content: editorRef.current?.getHTML() ?? "",
      };

      isApplyingUndoRedoRef.current = true;

      setTitle(snap.title);
      editorRef.current?.editor?.commands.setContent(snap.content, {
        emitUpdate: false,
      });

      isApplyingUndoRedoRef.current = false;
      saveDraftNow(snap.title);
      return;
    }

    if (area === "title") {
      const history = titleHistoryRef.current;

      while (history.length && history[history.length - 1] === title) {
        history.pop();
      }

      const prev = history.pop();
      if (prev === undefined) return;

      titleRedoRef.current.push(title);

      isApplyingUndoRedoRef.current = true;
      setTitle(prev);
      isApplyingUndoRedoRef.current = false;

      refocus("title");
      return;
    }

    if (area === "editor") {
      if (!editorRef.current?.editor?.can().undo()) return;

      isApplyingUndoRedoRef.current = true;
      editorRef.current.editor.commands.undo();
      isApplyingUndoRedoRef.current = false;

      refocus("editor");
    }
  };

  const handleRedo = () => {
    const area = getFocusArea();

    if (area === "none") {
      if (!globalRedoRef.current) return;

      const snap = globalRedoRef.current;
      globalRedoRef.current = null;

      globalUndoRef.current = {
        title,
        content: editorRef.current?.getHTML() ?? "",
      };

      isApplyingUndoRedoRef.current = true;

      setTitle(snap.title);
      editorRef.current?.editor?.commands.setContent(snap.content, {
        emitUpdate: false,
      });

      isApplyingUndoRedoRef.current = false;
      saveDraftNow(snap.title);
      return;
    }

    if (area === "title") {
      const redo = titleRedoRef.current;
      if (!redo.length) return;

      const next = redo.pop()!;
      titleHistoryRef.current.push(title);

      isApplyingUndoRedoRef.current = true;
      setTitle(next);
      isApplyingUndoRedoRef.current = false;

      refocus("title");
      return;
    }

    if (area === "editor") {
      if (!editorRef.current?.editor?.can().redo()) return;

      isApplyingUndoRedoRef.current = true;
      editorRef.current.editor.commands.redo();
      isApplyingUndoRedoRef.current = false;

      refocus("editor");
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;

      if (e.key === "z" && !e.shiftKey) {
        if (document.activeElement === titleInputRef.current) {
          e.preventDefault();
          handleUndo();
        }
      }

      if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        if (document.activeElement === titleInputRef.current) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [title]);

  return {
    handleUndo,
    handleRedo,
    clearModeRef,
    isApplyingUndoRedoRef,
    suppressTitleBlurRef,
    lastFocusedAreaRef,
    titleHistoryRef,
    titleRedoRef,
    globalUndoRef,
    globalRedoRef,
  };
}
