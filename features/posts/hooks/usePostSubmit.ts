"use client";

import { removeZWSP, extractTagsFromHTML } from "@/lib/processText";
import { xhrUpload } from "@/lib/xhrUpload";
import { PostType, PostTypes, Poll } from "@/types/post";
import { PostEditorWrapperRef } from "@/components/posts/PostForm/PostEditorWrapper";
import { extractJearnReferences } from "@/lib/post/extractJearnRelations";
import { extractMentionedUsers } from "@/lib/post/extractMentions";

type Params = {
  mode: PostType;
  questionId?: string;
  title: string;
  authorId: string | null;

  editorRef: React.RefObject<PostEditorWrapperRef | null>;
  pendingImagesRef: React.RefObject<Map<string, File>>;
  localBlobUrlsRef: React.RefObject<Map<string, string>>;

  pollOptions: { id: string; text: string }[];
  allowMultiple: boolean;
  expiresAt: string | null;

  videoFileRef: React.RefObject<File | null>;
  thumbnailFileRef: React.RefObject<File | null>;

  selectedCategories: string[];

  upload: {
    start: () => void;
    setUploading: (p: number) => void;
    setProcessing: () => void;
    finish: () => void;
  };

  onSubmit: (data: {
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
    video?: any;
  }) => Promise<void>;

  clearDraft: () => void;
  onSuccess?: () => void;
};

export function usePostSubmit({
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
  selectedCategories,
  upload,
  onSubmit,
  clearDraft,
  onSuccess,
}: Params) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    /* ================= VALIDATION ================= */

    if (mode !== PostTypes.ANSWER && !title.trim()) {
      alert("Title / description is required.");
      return;
    }

    if (
      mode !== PostTypes.ANSWER &&
      mode !== PostTypes.VIDEO &&
      selectedCategories.length === 0
    ) {
      alert("Choose a category.");
      return;
    }

    if (mode === PostTypes.POLL) {
      const validOptions = pollOptions.filter((o) => o.text.trim());
      if (validOptions.length < 2) {
        alert("Poll must have at least 2 options.");
        return;
      }
    }

    if (mode === PostTypes.VIDEO && !videoFileRef.current) {
      alert("Please upload a video.");
      return;
    }

    /* ================= CLOSE UI IMMEDIATELY ================= */

    onSuccess?.();

    /* ================= BACKGROUND TASK ================= */

    try {
      upload.start();

      let html = editorRef.current?.getHTML() ?? "";
      html = removeZWSP(html);

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      /* ================= IMAGE UPLOAD ================= */

      const images = Array.from(
        doc.querySelectorAll(
          "img[data-type='image-placeholder'][data-status='local']"
        )
      );

      for (const img of images) {
        const localId = img.getAttribute("data-id");
        if (!localId) continue;

        const file = pendingImagesRef.current.get(localId);
        if (!file) continue;

        const form = new FormData();
        form.append("file", file);

        const uploaded = await xhrUpload(
          "/api/media/upload",
          form,
          upload.setUploading
        );

        if (!uploaded?.url) throw new Error("Image upload failed");

        img.setAttribute("src", uploaded.url);
        img.removeAttribute("data-status");

        const blobUrl = localBlobUrlsRef.current.get(localId);
        if (blobUrl) URL.revokeObjectURL(blobUrl);
      }

      html = doc.body.innerHTML;
      const references = extractJearnReferences(html);
      const tags = extractTagsFromHTML(html);
      const mentionedUserIds = extractMentionedUsers(html);

      /* ================= VIDEO UPLOAD ================= */

      let video;
      if (mode === PostTypes.VIDEO && videoFileRef.current) {
        const form = new FormData();
        form.append("file", videoFileRef.current);

        if (thumbnailFileRef.current) {
          form.append("thumbnail", thumbnailFileRef.current);
        }

        video = await xhrUpload(
          "/api/media/upload/video",
          form,
          upload.setUploading
        );

        if (!video?.url) throw new Error("Video upload failed");
      }

      upload.setProcessing();

      /* ================= FINAL SUBMIT ================= */

      await onSubmit({
        postType: mode,
        questionId,
        title,
        content: mode === PostTypes.POLL ? "" : html,
        authorId,
        categories: [...selectedCategories],
        mentionedUserIds,
        tags,
        references,
        poll:
          mode === PostTypes.POLL
            ? {
                options: pollOptions
                  .filter((o) => o.text.trim())
                  .map((o) => ({
                    id: o.id,
                    text: o.text,
                    voteCount: 0,
                  })),
                totalVotes: 0,
                allowMultiple,
                expiresAt: expiresAt
                  ? new Date(expiresAt).toISOString()
                  : null,
              }
            : undefined,
        video,
      });

      clearDraft();

      upload.finish();
    } catch (err) {
      console.error("❌ Submit failed:", err);
      upload.finish();
    }
  };

  return { handleSubmit };
}
