"use client";

import {
  useState,
  useRef,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import PostEditorWrapper, {
  PostEditorWrapperRef,
} from "@/components/posts/PostForm/PostEditorWrapper";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { createPortal } from "react-dom";
import { PostType, PostTypes, Poll } from "@/types/post";
import {
  extractTagsFromHTML,
  extractTextWithMath,
  removeZWSP,
} from "@/lib/processText";
import { useUpload } from "@/components/upload/UploadContext";

/*COMPONENTS*/
import PostFormPoll from "./PostFormPoll";
import PostFormFooter from "./PostFormFooter";
/*HOOKS*/
import { usePollState } from "@/features/posts/hooks/usePollState";
import { useVideoState } from "@/features/posts/hooks/useVideoState";
import { useCategoryState } from "@/features/posts/hooks/useCategoryState";
import { usePostUndo } from "@/features/posts/hooks/usePostUndo";
import { usePostDraft } from "@/features/posts/hooks/usePostDraft";
import { usePostSubmit } from "@/features/posts/hooks/usePostSubmit";
import PostFormVideo from "./PostFormVideo";
import PostFormCategories from "./PostFormCategories";

export interface PostFormData {
  postType: PostType;
  questionId?: string;
  title: string;
  content: string;
  authorId: string | null;
  categories: string[];
  mentionedUserIds: string[];
  tags: string[];
  references?: string[];
  poll?: Poll;
  video?: {
    url: string;
    thumbnailUrl?: string;
    duration?: number;
    aspectRatio?: number;
  };
}

export interface PostFormHandle {
  insertImage: () => void;
}

export interface Category {
  id: string;
  label: string;
  jname?: string;
  myname?: string;
  score: number;
}

export interface PostFormProps {
  mode: PostType;
  questionId?: string;
  onSubmit: (data: PostFormData) => Promise<void>;
  initialTitle?: string;
  initialContent?: string;
  initialPoll?: Poll;
  initialVideo?: {
    url: string;
    thumbnailUrl?: string | null;
    duration?: number | null;
    aspectRatio?: number | null;
  };

  initialCommentDisabled?: boolean;

  initialSelectedCategories?: string[];
  initialAvailableCategories?: Category[];
  submitLabel?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  isEdit?: boolean;
}

// ✅ 修正点1: 空配列の参照を固定するための定数
const EMPTY_CATEGORIES: Category[] = [];
const EMPTY_STRING_ARRAY: string[] = [];

const PostForm = forwardRef<PostFormHandle, PostFormProps>(function PostForm(
  {
    mode,
    questionId,
    onSubmit,
    initialTitle = "",
    initialContent = "",
    initialPoll,
    initialVideo,
    initialCommentDisabled,
    initialSelectedCategories = EMPTY_STRING_ARRAY,
    initialAvailableCategories = EMPTY_CATEGORIES,
    onSuccess,
    onCancel,
    isEdit = false,
  },

  ref
) {
  const [title, setTitle] = useState(initialTitle);
  useEffect(() => {
    if (!isEdit) return;
    setTitle(initialTitle);
  }, [initialTitle]);

  const editorRef = useRef<PostEditorWrapperRef>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const editorReadyRef = useRef(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const editorHostRef = useRef<HTMLDivElement>(null);

  const isPoll = mode === PostTypes.POLL;

  const {
    pollOptions,
    allowMultiple,
    setAllowMultiple,
    expiresAt,
    setExpiresAt,
    addOption,
    removeOption,
    updateOption,
  } = usePollState(isPoll, initialPoll, isEdit);

  const [footerHeight, setFooterHeight] = useState(0);
  const pendingImagesRef = useRef<Map<string, File>>(new Map());
  const localBlobUrlsRef = useRef<Map<string, string>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);

  const [commentDisabled, setCommentDisabled] = useState(
    initialCommentDisabled ?? false
  );

  const {
    videoFileRef,
    thumbnailFileRef,
    videoPreviewUrl,
    thumbnailPreviewUrl,
    selectVideo,
    selectThumbnail,
  } = useVideoState(initialVideo, isEdit);

  const {
    categories,
    setCategories,
    selected,
    setSelected,
    visibleCount,
    setVisibleCount,
    categoryReady,
    setCategoryReady,
    handleSelectCategory,
    ordered,
    visibleCats,
  } = useCategoryState({
    initialAvailableCategories,
    initialSelectedCategories,
  });

  // コンテンツがある(編集時)なら変更なし(false)、なければ変更あり(true)
  const [contentChanged, setContentChanged] = useState(!initialContent);

  const [isTitleFocused, setIsTitleFocused] = useState(false);

  const [animatingLayout, setAnimatingLayout] = useState(false);

  const { user, loading } = useCurrentUser();
  const { t } = useTranslation();

  const authorId = user?._id || null;
  const lastTitleChangeAtRef = useRef<number>(0);
  const editContentInitializedRef = useRef(false);

  const [linkPopup, setLinkPopup] = useState<{
    url: string;
    from: number;
    to: number;
  } | null>(null);

  const [linkMode, setLinkMode] = useState<"card" | "hyperlink">("card");
  const [customLabel, setCustomLabel] = useState("");

  const applyJearnLink = () => {
    if (!linkPopup || !editorRef.current?.editor) return;

    const editor = editorRef.current.editor;
    const { url, from, to } = linkPopup;

    editor.commands.focus();

    if (linkMode === "hyperlink") {
      // 🔥 Replace original URL text with custom label
      editor
        .chain()
        .setTextSelection({ from, to })
        .insertContent({
          type: "text",
          text: customLabel || url,
          marks: [
            {
              type: "link",
              attrs: { href: url },
            },
          ],
        })
        .run();
    } else {
      // 🧱 Card mode (same as before)
      const { state } = editor;
      const linkCardType = state.schema.nodes.linkCard;
      if (!linkCardType) return;

      const $from = state.doc.resolve(from);
      const blockStart = $from.before();
      const blockEnd = $from.after();

      let tr = state.tr.delete(blockStart, blockEnd);

      const node = linkCardType.create({
        url,
        loading: true,
      });

      tr = tr.insert(blockStart, node);

      const paragraph = state.schema.nodes.paragraph.create();
      tr = tr.insert(blockStart + node.nodeSize, paragraph);

      editor.view.dispatch(tr);
    }

    setLinkPopup(null);
  };

  useEffect(() => {
    if (linkMode === "hyperlink" && linkPopup) {
      setCustomLabel("");
    }
  }, [linkMode]);

  // ================= DRAFT SAVE FIX =================
  const {
    draftLoaded,
    editorKey,
    saveDraftNow,
    restoreDraftIntoEditor,
    clearDraftForCurrentUser,
  } = usePostDraft({
    enabled: !isEdit,
    userId: user?._id ?? null,
    mode,
    questionId,
    initialTitle,
    initialContent,
    editorRef,
    editorHostRef,
    pendingImagesRef,
    localBlobUrlsRef,
  });

  // always keep latest title (avoids stale closure)
  const latestTitleRef = useRef(title);
  useEffect(() => {
    latestTitleRef.current = title;
  }, [title]);

  // prevent out-of-order async overwrites
  const saveSeqRef = useRef(0);
  const saveInFlightRef = useRef<Promise<void> | null>(null);

  // serialize + last-write-wins
  const saveDraftSafe = (nextTitle?: string) => {
    if (isEdit) return Promise.resolve();
    const seq = ++saveSeqRef.current;

    const run = async () => {
      if (saveInFlightRef.current) {
        try {
          await saveInFlightRef.current;
        } catch {}
      }

      if (seq !== saveSeqRef.current) return;

      const html = editorRef.current?.getHTML() ?? "";

      await saveDraftNow(nextTitle ?? latestTitleRef.current, removeZWSP(html));
    };

    const p = run();
    saveInFlightRef.current = p;
    return p;
  };

  const TITLE_UNDO_THRESHOLD = 300;

  const saveDraftBridge = (nextTitle?: string) => {
    const html = editorRef.current?.getHTML() ?? "";
    return saveDraftNow(nextTitle ?? title, removeZWSP(html));
  };

  useEffect(() => {
    if (isEdit) return; // BLOCK DRAFT IN EDIT MODE
    if (!draftLoaded) return;
    if (!editorRef.current?.editor) return;

    requestAnimationFrame(() => {
      restoreDraftIntoEditor(setTitle);
    });
  }, [draftLoaded, mode, isEdit]);

  const {
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
  } = usePostUndo({
    title,
    setTitle,
    editorRef,
    titleInputRef,
    editorHostRef,
    saveDraftNow: saveDraftBridge,
  });
  const upload = useUpload();

  // ✅ 修正点3: 依存配列の問題が解消され、無限ループしなくなります

  useEffect(() => {
    if (!footerRef.current) return;

    const update = () => {
      setFooterHeight(footerRef.current!.offsetHeight);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;

      if (e.key === "z" && !e.shiftKey) {
        const active = document.activeElement;

        // 🔑 only hijack when title input is focused
        if (active === titleInputRef.current) {
          e.preventDefault();
          handleUndo();
        }
      }

      if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        const active = document.activeElement;

        if (active === titleInputRef.current) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* -------------------------------------------------------------------------- */
  /* CHECK CATEGORIES                              */
  /* -------------------------------------------------------------------------- */
  const handleCheckCategories = async () => {
    if (mode === PostTypes.ANSWER) return;

    let html = editorRef.current?.getHTML() ?? "";
    html = removeZWSP(html);

    const text = extractTextWithMath(html).trim();
    const hasMedia =
      html.includes("<img") ||
      html.includes("<video") ||
      html.includes("math-inline") ||
      html.includes("math-block");

    if (!text && !hasMedia && !title.trim()) return;

    const pollText = isPoll ? pollOptions.map((o) => o.text).join("\n") : "";

    const checkText = `title: ${title}\n${text}\n${pollText}`;

    setContentChanged(false);
    setCategoryReady(false);
    setChecking(true);
    setCategories([]);
    setSelected([]);
    setVisibleCount(5);

    try {
      const res = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: checkText }),
      });

      if (!res.ok) throw new Error("Categorization failed");

      const data = await res.json();

      const preds = Array.isArray(data) ? data : data.predictions;

      if (!Array.isArray(preds)) {
        throw new Error("Invalid AI format");
      }

      setCategories(preds);
      setCategoryReady(true);
    } catch (err) {
      console.error("❌ Category check failed:", err);
      setCategoryReady(false);
    } finally {
      setChecking(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /* CONTENT CHANGE                                */
  /* -------------------------------------------------------------------------- */
  const handleEditorUpdate = () => {
    if (!editorRef.current) return;
    if (isApplyingUndoRedoRef.current) return;

    saveDraftSafe();
    setContentChanged(true);
  };
  const handleClearContent = () => {
    const editor = editorRef.current?.editor;
    if (!editor) return;

    const content = editor.getHTML();

    // 🔑 save global snapshot
    globalUndoRef.current = { title, content };
    globalRedoRef.current = null;

    clearModeRef.current = true;

    editorRef.current?.clearWithHistory();
    setTitle("");
    setContentChanged(true);

    (document.activeElement as HTMLElement | null)?.blur();
    lastFocusedAreaRef.current = "none";

    if (authorId) {
      saveDraftSafe("");
    }
  };
  const insertImage = () => {
    if (mode === PostTypes.VIDEO) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const localUrl = URL.createObjectURL(file);
      const localId = crypto.randomUUID();

      editorRef.current?.editor
        ?.chain()
        .focus()
        .insertImagePlaceholder(localId, localUrl)
        .run();

      requestAnimationFrame(() => {
        const editorEl = editorHostRef.current;
        if (!editorEl) return;

        const img = editorEl.querySelector(
          `img[data-type="image-placeholder"][data-id="${localId}"]`
        ) as HTMLImageElement | null;

        if (img) img.setAttribute("data-status", "local");
      });

      pendingImagesRef.current.set(localId, file);
      localBlobUrlsRef.current.set(localId, localUrl);

      saveDraftSafe();
    };

    input.click();
  };
  /* -------------------------------------------------------------------------- */
  /* SUBMIT                                                                     */
  /* -------------------------------------------------------------------------- */
  const { handleSubmit } = usePostSubmit({
    mode,
    questionId,
    title,
    authorId,
    editorRef,
    pendingImagesRef,
    localBlobUrlsRef,
    pollOptions,
    allowMultiple,
    expiresAt,
    videoFileRef,
    thumbnailFileRef,
    selectedCategories: selected,
    upload,
    commentDisabled,
    onSubmit,
    clearDraft: clearDraftForCurrentUser,
    onSuccess,
  });

  const avatarUrl = useMemo(() => {
    if (!user) return null;

    const updatedAt = user.avatarUpdatedAt
      ? new Date(user.avatarUpdatedAt).getTime()
      : "";

    return updatedAt ? `${user.picture}?t=${updatedAt}` : user.picture;
  }, [user?.picture, user?.avatarUpdatedAt]);

  useImperativeHandle(ref, () => ({
    insertImage,
  }));

  const nowLocal = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm
  }, []);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col min-h-0 bg-white dark:bg-neutral-900 rounded-lg"
      >
        {/* ================= SCROLL AREA ================= */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <>
            <motion.div
              animate={{
                boxShadow: isTitleFocused
                  ? "0px 0px 12px rgba(0,0,0,0.15)"
                  : "0px 0px 0px rgba(0,0,0,0)",
              }}
              className={`rounded-lg border transition ${
                isTitleFocused
                  ? "border-black dark:border-white"
                  : "border-gray-300 dark:border-gray-500"
              }`}
            >
              <input
                ref={titleInputRef}
                type="text"
                placeholder={
                  mode === PostTypes.VIDEO
                    ? "Add a description"
                    : mode === PostTypes.QUESTION
                    ? t("questionEnter")
                    : t("title")
                }
                value={title}
                maxLength={200}
                onChange={(e) => {
                  if (isApplyingUndoRedoRef.current) {
                    setTitle(e.target.value);
                    return;
                  }

                  const next = e.target.value;
                  const now = Date.now();

                  if (
                    now - lastTitleChangeAtRef.current >
                    TITLE_UNDO_THRESHOLD
                  ) {
                    titleHistoryRef.current.push(title);
                  }

                  lastTitleChangeAtRef.current = now;
                  titleRedoRef.current.length = 0;

                  setTitle(next);
                  setContentChanged(true);
                  saveDraftSafe(next);
                }}
                onFocus={() => {
                  clearModeRef.current = false; // 🔓 unlock
                  lastFocusedAreaRef.current = "title";
                  setIsTitleFocused(true);
                }}
                onBlur={() => {
                  setIsTitleFocused(false);

                  // ✅ ignore blur caused by undo/redo buttons (mousedown) or programmatic ops
                  if (
                    suppressTitleBlurRef.current ||
                    isApplyingUndoRedoRef.current
                  )
                    return;

                  const hist = titleHistoryRef.current;
                  if (hist.length === 0 || hist[hist.length - 1] !== title) {
                    hist.push(title);
                  }
                }}
                className="w-full text-xl px-2 py-3 bg-transparent focus:outline-none disabled:opacity-30"
                autoComplete="off"
                disabled={isEdit && mode === PostTypes.QUESTION}
              />
            </motion.div>
            <p className="text-right text-xs text-gray-500 dark:text-gray-400 px-1 pb-1">
              {title.length}/200
            </p>
          </>

          {/* ------------------------------ Editor ------------------------------ */}
          <div ref={editorHostRef} className="overflow-visible rounded-md">
            {(isEdit || draftLoaded) && (
              <PostEditorWrapper
                key={isEdit ? "edit-static" : editorKey}
                ref={editorRef}
                onUpdate={handleEditorUpdate}
                onFocus={() => {
                  clearModeRef.current = false;
                  lastFocusedAreaRef.current = "editor";
                }}
                onJearnLinkDetected={(data) => {
                  setLinkPopup(data);
                  setCustomLabel(data.url); // default label = url
                  setLinkMode("card");
                }}
                onReady={() => {
                  editorReadyRef.current = true;
                
                  const editor = editorRef.current?.editor;
                  if (!editor) return;
                
                  if (isEdit && !editContentInitializedRef.current) {
                    editor.commands.setContent(
                      removeZWSP(initialContent || ""),
                      { emitUpdate: false }
                    );
                
                    editContentInitializedRef.current = true;
                  }
                
                  if (!isEdit && draftLoaded) {
                    requestAnimationFrame(() => {
                      restoreDraftIntoEditor(setTitle);
                    });
                  }
                }}
                
              />
            )}
          </div>

          {isPoll && (
            <PostFormPoll
              pollOptions={pollOptions}
              allowMultiple={allowMultiple}
              setAllowMultiple={setAllowMultiple}
              expiresAt={expiresAt}
              setExpiresAt={setExpiresAt}
              addOption={addOption}
              removeOption={removeOption}
              updateOption={updateOption}
              nowLocal={nowLocal}
            />
          )}

          {/* ------------------------------ Categories ------------------------------ */}
          <AnimatePresence>
            {(!contentChanged || initialAvailableCategories.length > 0) &&
              categoryReady &&
              categories.length > 0 &&
              mode !== PostTypes.ANSWER && (
                <PostFormCategories
                  visibleCats={visibleCats}
                  selected={selected}
                  handleSelectCategory={handleSelectCategory}
                  visibleCount={visibleCount}
                  setVisibleCount={setVisibleCount}
                  orderedLength={ordered.length}
                  animatingLayout={animatingLayout}
                  setAnimatingLayout={setAnimatingLayout}
                  t={t}
                />
              )}

            {mode === PostTypes.VIDEO && (
              <PostFormVideo
                videoPreviewUrl={videoPreviewUrl}
                thumbnailPreviewUrl={thumbnailPreviewUrl}
                selectVideo={selectVideo}
                selectThumbnail={selectThumbnail}
              />
            )}
          </AnimatePresence>
        </div>

        {/* ------------------------------ Footer ------------------------------ */}
        <PostFormFooter
          user={user}
          avatarUrl={avatarUrl}
          t={t}
          mode={mode}
          loading={loading}
          submitting={submitting}
          categories={categories}
          contentChanged={contentChanged}
          selected={selected}
          handleUndo={handleUndo}
          handleRedo={handleRedo}
          handleClearContent={handleClearContent}
          handleCheckCategories={handleCheckCategories}
        />
      </motion.form>
      {mounted &&
        linkPopup &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* backdrop */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setLinkPopup(null)}
            />

            {/* modal */}
            <div
              className="relative w-96 bg-white dark:bg-neutral-800 shadow-2xl border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-lg font-semibold">Insert JEARN Link</div>

              <div className="flex bg-gray-100 dark:bg-neutral-700 rounded-lg p-1 text-sm">
                <button
                  type="button"
                  className={`flex-1 py-1 rounded-md ${
                    linkMode === "card"
                      ? "bg-white dark:bg-neutral-800 shadow"
                      : "opacity-60"
                  }`}
                  onClick={() => setLinkMode("card")}
                >
                  Link Card
                </button>

                <button
                  type="button"
                  className={`flex-1 py-1 rounded-md ${
                    linkMode === "hyperlink"
                      ? "bg-white dark:bg-neutral-800 shadow"
                      : "opacity-60"
                  }`}
                  onClick={() => setLinkMode("hyperlink")}
                >
                  Custom Link
                </button>
              </div>

              {linkMode === "hyperlink" && (
                <input
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="Display text"
                  className="w-full px-3 py-2 text-sm border rounded-md bg-transparent"
                />
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-3 py-1 text-sm bg-gray-200 dark:bg-neutral-600 rounded-md"
                  onClick={() => setLinkPopup(null)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md"
                  onClick={applyJearnLink}
                >
                  Insert
                </button>
              </div>
            </div>
          </div>,
          document.body // 🔥 THIS is the required second argument
        )}
    </>
  );
});

export default PostForm;
