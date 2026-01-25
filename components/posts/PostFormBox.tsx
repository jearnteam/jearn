"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Portal from "@/components/common/Portal";
import PostForm from "./PostForm";
import { useTranslation } from "react-i18next";
import { PostType, PostTypes } from "@/types/post";

interface PostFormBoxProps {
  open: boolean;
  onClose: () => void;

  // ✅ UPDATED: video is now supported
  onSubmit: (
    postType: PostType,
    title: string,
    content: string,
    authorId: string | null,
    categories: string[],
    tags: string[],
    video?: {
      url: string;
      thumbnailUrl?: string;
      duration?: number;
      aspectRatio?: number;
    }
  ) => Promise<void>;

  type?: (typeof PostTypes)[Extract<
    keyof typeof PostTypes,
    "POST" | "QUESTION" | "ANSWER" | "VIDEO"
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

  /* ⭐ Reset to POST when modal opens (except ANSWER) */
  useEffect(() => {
    if (open && mode !== PostTypes.ANSWER) {
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
              className="
  w-full max-w-4xl max-h-[80vh]
  bg-white dark:bg-neutral-900
  shadow-lg rounded-2xl
  border border-gray-200 dark:border-gray-700
  flex flex-col
"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ---------------- Header ---------------- */}
              <header className="p-4 bg-white dark:bg-neutral-900 z-10">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">
                    {mode === PostTypes.POST
                      ? t("createPost") || "Create Post"
                      : mode === PostTypes.QUESTION
                      ? "Ask Question"
                      : mode === PostTypes.VIDEO
                      ? "Upload Video"
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

                {/* ---------------- Tabs ---------------- */}
                {mode !== PostTypes.ANSWER && (
                  <div className="flex mt-4 border-b dark:border-gray-700">
                    <button
                      className={`w-1/3 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 ${
                        mode === PostTypes.POST
                          ? "border-b-2 border-blue-500 text-blue-600 font-semibold"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                      onClick={() => setMode(PostTypes.POST)}
                    >
                      📝 {t("post") || "Post"}
                    </button>

                    <button
                      className={`w-1/3 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 ${
                        mode === PostTypes.QUESTION
                          ? "border-b-2 border-orange-500 text-orange-600 font-semibold"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                      onClick={() => setMode(PostTypes.QUESTION)}
                    >
                      ❓ {t("question") || "Question"}
                    </button>

                    <button
                      className={`w-1/3 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 ${
                        mode === PostTypes.VIDEO
                          ? "border-b-2 border-purple-500 text-purple-600 font-semibold"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                      onClick={() => setMode(PostTypes.VIDEO)}
                    >
                      🎥 {t("video") || "Video"}
                    </button>
                  </div>
                )}
              </header>

              {/* ---------------- Content ---------------- */}
              <section className="flex-1 flex flex-col min-h-0">
                <PostForm
                  mode={mode}
                  onCancel={onClose}
                  onSubmit={async (data) => {
                    await onSubmit(
                      data.postType,
                      data.title,
                      data.content,
                      data.authorId,
                      data.categories,
                      data.tags,
                      data.video
                    );
                  }}
                />
              </section>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
