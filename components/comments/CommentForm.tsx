"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import PostEditorWrapper, {
  PostEditorWrapperRef,
} from "@/components/posts/PostForm/PostEditorWrapper";
import { useTranslation } from "react-i18next";
import { PostTypes } from "@/types/post";
import { removeZWSP } from "@/lib/processText";
import { useUpload } from "@/components/upload/UploadContext";
import { xhrUpload } from "@/lib/xhrUpload";
import {
  loadDraft,
  saveDraft,
  clearDraft,
  type PostDraftRecord,
} from "@/lib/postDraft";
import { Undo, Redo, Eraser, ImagePlus } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  parentId: string;
  replyTo?: string | null;
  onSubmitted?: (content: string) => void | Promise<void>;
  onCancel?: () => void;
  mode?: "comment" | "reply";
  autoFocus?: boolean;
}

export default function CommentForm({
  parentId,
  replyTo = null,
  onSubmitted,
  onCancel,
  mode = "comment",
  autoFocus = false,
}: Props) {
  const { t } = useTranslation();
  const { user } = useCurrentUser();

  const editorRef = useRef<PostEditorWrapperRef>(null);
  const [submitting, setSubmitting] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  
  // Image Upload Refs
  const pendingImagesRef = useRef<Map<string, File>>(new Map());
  const localBlobUrlsRef = useRef<Map<string, string>>(new Map());

  // Draft Key: "userId:comment:parentId" (replyToがあればそれも含む)
  const draftKey = user?._id 
    ? `${user._id}:comment:${parentId}${replyTo ? `:${replyTo}` : ""}` 
    : null;

  /* -------------------------------------------------------------------------- */
  /* DRAFT LOADING
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    if (!user?._id || !draftKey) return;

    const initDraft = async () => {
      // modeは便宜上 COMMENT として保存
      const rawDraft = await loadDraft(user._id, PostTypes.COMMENT, parentId + (replyTo || ""));
      
      if (rawDraft) {
        editorRef.current?.editor?.commands.setContent(rawDraft.content, { emitUpdate: false });
        
        // 画像のBlob URL復元
        requestAnimationFrame(() => {
          const host = document.getElementById(`comment-editor-${parentId}`);
          if (!host) return;

          for (const img of rawDraft.images) {
            const blob = new Blob([img.buffer], { type: img.mime });
            const url = URL.createObjectURL(blob);
            localBlobUrlsRef.current.set(img.id, url);

            host.querySelectorAll(`img[data-type="image-placeholder"]`).forEach((el) => {
              if (el.getAttribute("data-id") === img.id) {
                (el as HTMLImageElement).src = url;
                el.setAttribute("data-status", "local");
              }
            });
          }
        });
      }
      setDraftLoaded(true);
    };

    initDraft();
  }, [user?._id, draftKey, parentId, replyTo]);

  /* -------------------------------------------------------------------------- */
  /* DRAFT SAVING
  /* -------------------------------------------------------------------------- */
  const saveDraftNow = async () => {
    if (!user?._id || !editorRef.current) return;

    const html = removeZWSP(editorRef.current.getHTML());
    
    // 画像プレースホルダーを置換して保存
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("img[data-type='image-placeholder']").forEach((img) => {
      img.setAttribute("src", "__DRAFT_IMAGE__");
    });
    
    const content = doc.body.innerHTML;

    // 画像データをバッファとして保存
    const images = await Promise.all(
      Array.from(pendingImagesRef.current.entries()).map(async ([id, file]) => ({
        id,
        buffer: await file.arrayBuffer(),
        mime: file.type,
      }))
    );

    saveDraft(
      user._id,
      PostTypes.COMMENT,
      { title: "", content, images },
      parentId + (replyTo || "")
    );
  };

  const handleEditorUpdate = () => {
    saveDraftNow();
  };

  /* -------------------------------------------------------------------------- */
  /* IMAGE INSERTION
  /* -------------------------------------------------------------------------- */
  const insertImage = () => {
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

      // DOM更新後に属性セット
      requestAnimationFrame(() => {
        const host = document.getElementById(`comment-editor-${parentId}`);
        const img = host?.querySelector(`img[data-type="image-placeholder"][data-id="${localId}"]`);
        if (img) img.setAttribute("data-status", "local");
      });

      pendingImagesRef.current.set(localId, file);
      localBlobUrlsRef.current.set(localId, localUrl);
      saveDraftNow();
    };
    input.click();
  };

  /* -------------------------------------------------------------------------- */
  /* SUBMIT LOGIC
  /* -------------------------------------------------------------------------- */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return alert("Please log in.");

    let html = editorRef.current?.getHTML() ?? "";
    if (!removeZWSP(html).trim()) return;

    setSubmitting(true);

    try {
      // 1. Upload Images
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const images = Array.from(
        doc.querySelectorAll("img[data-type='image-placeholder'][data-status='local']")
      );

      for (const img of images) {
        const localId = img.getAttribute("data-id");
        if (!localId) continue;
        const file = pendingImagesRef.current.get(localId);
        if (!file) continue;

        const form = new FormData();
        form.append("file", file);

        const uploaded = await xhrUpload("/api/media/upload", form);
        if (!uploaded?.url) throw new Error("Image upload failed");

        img.setAttribute("src", uploaded.url);
        img.removeAttribute("data-status");
        
        // メモリ開放
        const blobUrl = localBlobUrlsRef.current.get(localId);
        if(blobUrl) URL.revokeObjectURL(blobUrl);
      }

      html = doc.body.innerHTML;

      // 2. Submit Content
      await onSubmitted?.(html);

      // 3. Cleanup
      editorRef.current?.clearWithHistory?.();
      clearDraft(user._id, PostTypes.COMMENT, parentId + (replyTo || ""));
      pendingImagesRef.current.clear();
      localBlobUrlsRef.current.clear();

    } catch (err) {
      console.error("❌ Submit failed:", err);
      alert("Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  }

  /* -------------------------------------------------------------------------- */
  /* RENDER
  /* -------------------------------------------------------------------------- */
  const placeholder = mode === "reply" ? "Write a reply..." : "Write a comment...";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {replyTo && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Replying to a comment
        </div>
      )}

      <div 
        id={`comment-editor-${parentId}`}
        className="relative border rounded-lg overflow-hidden bg-gray-50 dark:bg-black/20 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all"
      >
        <PostEditorWrapper
          ref={editorRef}
          initialValue=""
          placeholder={placeholder}
          compact
          onUpdate={handleEditorUpdate}
          onReady={() => {
             if (autoFocus) editorRef.current?.focus();
          }}
        />
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Image Upload */}
          <button
            type="button"
            onClick={insertImage}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-600 dark:text-gray-300 transition"
            title="Add Image"
          >
            <ImagePlus size={18} />
          </button>

          {/* Undo */}
          <button
            type="button"
            onClick={() => editorRef.current?.editor?.commands.undo()}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-600 dark:text-gray-300 transition"
            title="Undo"
          >
            <Undo size={18} />
          </button>

          {/* Redo */}
          <button
            type="button"
            onClick={() => editorRef.current?.editor?.commands.redo()}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-600 dark:text-gray-300 transition"
            title="Redo"
          >
            <Redo size={18} />
          </button>

          {/* Clear */}
          <button
            type="button"
            onClick={() => {
              if(confirm("Clear comment?")) {
                editorRef.current?.clearWithHistory();
                saveDraftNow();
              }
            }}
            className="p-2 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition"
            title="Clear"
          >
            <Eraser size={18} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="text-sm text-gray-600 hover:underline dark:text-gray-300"
            >
              {t("cancel")}
            </button>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={submitting || !draftLoaded}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition
              ${submitting 
                ? "bg-gray-400 cursor-not-allowed" 
                : "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg"
              }`}
          >
            {submitting ? "Posting..." : mode === "reply" ? "Reply" : t("postComment")}
          </motion.button>
        </div>
      </div>
    </form>
  );
}