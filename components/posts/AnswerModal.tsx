"use client";

import { motion, AnimatePresence } from "framer-motion";
import Portal from "@/components/common/Portal";
import PostForm from "@/components/posts/PostForm/PostForm";
import { MathRenderer } from "@/components/math/MathRenderer"; // 質問内容の表示用
import { useTranslation } from "react-i18next";
import type { Post, PostType } from "@/types/post";
import { PostTypes } from "@/types/post";
import Link from "next/link";
import dayjs from "@/lib/dayjs";
import { hasMeaningfulContent } from "@/lib/processText";

interface AnswerModalProps {
  questionPost: Post;
  onClose: () => void;
  onSubmit: (
    postType: PostType,
    title: string,
    content: string,
    authorId: string | null,
    tags: string[],
    parentId: string
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
            className="w-full max-w-5xl max-h-[90vh] flex flex-col bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-neutral-900 z-10">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="text-orange-500">A.</span>
                {t("answerToQuestion")}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* LEFT: QUESTION PREVIEW (Desktop) / TOP (Mobile) */}
              {/* 質問内容を確認しながら回答できるように表示 */}
              <div className="w-full md:w-2/5 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black overflow-y-auto">
                <div className="p-6 space-y-4">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Target Question
                    </div>
                    <h3 className="text-lg font-bold leading-tight">
                      {questionPost.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                      {questionPost.authorName} •{" "}
                      {dayjs(questionPost.createdAt).fromNow()}
                    </div>
                  </div>

                  {questionPost.content &&
                    hasMeaningfulContent(questionPost.content) && (
                      <div className="prose dark:prose-invert prose-sm max-w-none break-words p-4 rounded-lg bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 shadow-sm">
                        <MathRenderer html={questionPost.content} />
                      </div>
                    )}
                </div>
              </div>

              {/* RIGHT: ANSWER FORM */}
              <div className="w-full md:w-3/5 flex flex-col bg-white dark:bg-neutral-900 h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto p-2 md:p-0">
                  <PostForm
                    mode={PostTypes.ANSWER}
                    questionId={questionPost._id}
                    submitLabel={t("postAnswer")}
                    onSubmit={async (data) => {
                      // PostForm からのデータを Answer 用に変換して送信
                      await onSubmit(
                        data.postType,
                        data.title,
                        data.content,
                        data.authorId,
                        data.tags,
                        questionPost._id // parentId として質問IDを渡す
                      );
                      onClose();
                    }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
}
