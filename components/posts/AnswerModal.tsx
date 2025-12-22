"use client";

import { motion, AnimatePresence } from "framer-motion";
import Portal from "@/components/common/Portal";
import PostForm, { Category } from "@/components/posts/PostForm"; // ✅ 新しいPostFormを使用
import { useTranslation } from "react-i18next";
import type { Post, PostType } from "@/types/post";
import { PostTypes } from "@/types/post";

interface AnswerModalProps {
  questionPost: Post;
  onClose: () => void;
  onSubmit: (
    postType: PostType,
    content: string,
    authorId: string | null,
    tags: string[],
    parentId: string,
  ) => Promise<void>;
}

export default function AnswerModal({
  questionPost,
  onClose,
  onSubmit,
}: AnswerModalProps) {
  const { t } = useTranslation();

  return (
    <Portal>
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-4xl max-h-[85vh] flex flex-col bg-white dark:bg-neutral-900 rounded-2xl border shadow-xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold">{t("Answer")}</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div>
                {/* TODO: 質問内容を表示する */}
                {questionPost.title}
                {questionPost.content}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <PostForm
                // post.postType があればそれを使うが、なければ POST か QUESTION と推測
                mode={PostTypes.ANSWER}
                submitLabel={t("answer") || "Answer"}
                onCancel={onClose}
                onSubmit={async (data) => {
                  await onSubmit(
                    data.postType,
                    data.content,
                    data.authorId,
                    data.tags,
                    data.parentId,
                  );
                  onClose();
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
}
