import { useEffect, useMemo, useRef, useState } from "react";
import {
  loadDraft,
  saveDraft,
  clearDraft,
  PostDraftRecord,
} from "@/lib/postDraft";
import { removeZWSP } from "@/lib/processText";
import { PostTypes, PostType } from "@/types/post";
import { PostEditorWrapperRef } from "@/components/posts/PostForm/PostEditorWrapper";

type Params = {
  userId: string | null;
  mode: PostType;
  questionId?: string;
  initialTitle: string;
  initialContent: string;
  editorRef: React.RefObject<PostEditorWrapperRef | null>;
  editorHostRef: React.RefObject<HTMLDivElement | null>;
  pendingImagesRef: React.RefObject<Map<string, File>>;
  localBlobUrlsRef: React.RefObject<Map<string, string>>;
};

export function usePostDraft({
  userId,
  mode,
  questionId,
  initialTitle,
  initialContent,
  editorRef,
  editorHostRef,
  pendingImagesRef,
  localBlobUrlsRef,
}: Params) {
  const [draftLoaded, setDraftLoaded] = useState(false);
  const pendingDraftRef = useRef<PostDraftRecord | null>(null);

  const draftKey = useMemo(() => {
    if (!userId) return null;
    return `${userId}:${mode}:${
      mode === PostTypes.ANSWER ? questionId ?? "" : ""
    }`;
  }, [userId, mode, questionId]);

  const editorKey = useMemo(() => {
    if (!userId) return "anon";
    return `editor:${draftKey}`;
  }, [draftKey, userId]);

  const getDraftScope = () => ({
    userId: userId!,
    postType: mode,
    questionId: mode === PostTypes.ANSWER ? questionId : undefined,
  });

  /* -------------------------------------------------- */
  /* SAVE DRAFT                                         */
  /* -------------------------------------------------- */

  const saveDraftNow = async (title: string, content: string) => {
    if (!userId) return;

    const { userId: uid, postType, questionId: qid } = getDraftScope();

    const images = await Promise.all(
      Array.from(pendingImagesRef.current?.entries() ?? []).map(
        async ([id, file]) => ({
          id,
          buffer: await file.arrayBuffer(),
          mime: file.type,
        })
      )
    );

    await saveDraft(
      uid,
      postType,
      {
        title,
        content,
        images,
      },
      qid
    );
  };

  /* -------------------------------------------------- */
  /* LOAD DRAFT                                         */
  /* -------------------------------------------------- */

  useEffect(() => {
    if (!userId || !draftKey) return;

    let cancelled = false;

    const init = async () => {
      const { userId: uid, postType, questionId: qid } = getDraftScope();
      const rawDraft = await loadDraft(uid, postType, qid).catch(() => null);

      if (cancelled) return;

      const finalDraft: PostDraftRecord = rawDraft ?? {
        key: "__empty__",
        postType: mode,
        title: initialTitle,
        content: removeZWSP(initialContent || ""),
        images: [],
        updatedAt: Date.now(),
      };

      pendingDraftRef.current = finalDraft;
      setDraftLoaded(true);
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [draftKey, userId]);

  /* -------------------------------------------------- */
  /* RESTORE INTO EDITOR                                */
  /* -------------------------------------------------- */

  const restoreDraftIntoEditor = (setTitle: (v: string) => void) => {
    if (!draftLoaded || !pendingDraftRef.current) return;

    const draft = pendingDraftRef.current;
    const editor = editorRef.current?.editor;
    if (!editor) return;

    setTitle(draft.title ?? "");

    editor.commands.setContent(draft.content, { emitUpdate: false });

    // 🔥 FORCE ProseMirror transaction
    const { view } = editor;
    view.dispatch(view.state.tr.setMeta("forceUpdate", true));

    // 🔥 Force redraw
    editor.commands.setTextSelection(0);

    requestAnimationFrame(() => {
      const host = editorHostRef.current;
      if (!host) return;

      for (const img of draft.images) {
        const blob = new Blob([img.buffer], { type: img.mime });
        const url = URL.createObjectURL(blob);

        localBlobUrlsRef.current?.set(img.id, url);

        host
          .querySelectorAll(`img[data-type="image-placeholder"]`)
          .forEach((el) => {
            if (el.getAttribute("data-id") === img.id) {
              (el as HTMLImageElement).src = url;
              el.setAttribute("data-status", "local");
            }
          });
      }

      pendingDraftRef.current = null;
    });
  };

  /* -------------------------------------------------- */
  /* CLEAR DRAFT                                        */
  /* -------------------------------------------------- */

  const clearDraftForCurrentUser = () => {
    if (!userId) return;

    clearDraft(
      userId,
      mode,
      mode === PostTypes.ANSWER ? questionId : undefined
    );
  };

  return {
    draftLoaded,
    editorKey,
    saveDraftNow,
    restoreDraftIntoEditor,
    clearDraftForCurrentUser,
  };
}
