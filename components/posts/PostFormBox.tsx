"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Portal from "@/components/common/Portal";
import PostForm, { PostFormProps } from "./PostForm";
import { useTranslation } from "react-i18next";
import { PostType, PostTypes } from "@/types/post";

interface PostFormBoxProps {
  open: boolean;
  onClose: () => void;
  // PostFormPropsのonSubmitはオブジェクトを受け取るようになったため、親のシグネチャもそれに合わせるか、
  // ここでラップして元のシグネチャ (バラバラの引数) を維持するか。
  // 今回はリファクタリングなので、親からの呼び出し元も PostFormProps['onSubmit'] に合わせるのが理想的ですが、
  // 互換性維持のためラップします。
  onSubmit: (
    postType: PostType,
    title: string,
    content: string,
    authorId: string | null,
    categories: string[],
    tags: string[]
  ) => Promise<void>;
  type?: (typeof PostTypes)[Extract<
    keyof typeof PostTypes,
    "POST" | "QUESTION" | "ANSWER"
  >];
}

export default function PostFormBox({
  open,
  onClose,
  onSubmit,
  type = PostTypes.POST,
}: PostFormBoxProps) {
  const { t } = useTranslation();

  const [mode, setMode] = useState(type);

  /* ⭐ モーダルが開かれたら必ず post に戻す (Answer以外) */
  useEffect(() => {
    if (open && mode != PostTypes.ANSWER) {
      setMode(PostTypes.POST);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-modal="true"
            role="dialog"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-4xl max-h-[80vh] bg-white dark:bg-neutral-900 shadow-lg rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <header className="p-4 bg-white dark:bg-neutral-900 z-10">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">
                    {mode === PostTypes.POST
                      ? t("createPost") || "Create Post"
                      : mode === PostTypes.QUESTION
                      ? "Ask Question"
                      : mode === PostTypes.ANSWER
                      ? "Answer Question"
                      : "Create Post"}
                  </h2>
                  <button
                    onClick={onClose}
                    className="text-xl hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>

                {/* ▼ タブヘッダー */}
                {mode !== PostTypes.ANSWER && (
                  <div className="flex mt-4 border-b dark:border-gray-700">
                    <button
                      className={`w-1/2 text-center px-4 py-2 text-sm font-medium transition flex items-center justify-center gap-2 ${
                        mode === PostTypes.POST
                          ? "border-b-2 border-blue-500 text-blue-600 font-semibold"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                      onClick={() => setMode(PostTypes.POST)}
                    >
                      📝 {t("post") || "Post"}
                    </button>

                    <button
                      className={`w-1/2 text-center px-4 py-2 text-sm font-medium transition flex items-center justify-center gap-2 ${
                        mode === PostTypes.QUESTION
                          ? "border-b-2 border-orange-500 text-orange-600 font-semibold"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                      onClick={() => setMode(PostTypes.QUESTION)}
                    >
                      ❓ {t("question") || "Question"}
                    </button>
                  </div>
                )}
              </header>

              {/* Content */}
              <section className="flex-1 overflow-y-auto p-4">
                <PostForm
                  mode={mode}
                  // ✅ PostFormはオブジェクトを返すが、既存のonSubmit(引数バラバラ)に合わせて変換
                  onSubmit={async (data) => {
                    await onSubmit(
                      data.postType,
                      data.title,
                      data.content,
                      data.authorId,
                      data.categories,
                      data.tags
                    );
                    onClose();
                  }}
                  // 新規作成時はonCancelは不要（閉じるボタンがあるため）
                />
              </section>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}