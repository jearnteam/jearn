"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Portal from "@/components/common/Portal";
import PostForm, { PostFormProps } from "./PostForm";
import { useTranslation } from "react-i18next";

interface PostFormBoxProps {
  open: boolean;
  onClose: () => void;
  onSubmit: PostFormProps["onSubmit"];
}

export default function PostFormBox({
  open,
  onClose,
  onSubmit,
}: PostFormBoxProps) {
  const { t } = useTranslation();

  // ⭐ タブ状態
  const [activeTab, setActiveTab] = useState<"post" | "question">("post");

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
              <header className="p-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">
                    {t("createPost") || "Create Post"}
                  </h2>
                  <button
                    onClick={onClose}
                    className="text-xl hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>

                {/* ▼ タブヘッダー */}
                <div className="flex mt-4 border-b dark:border-gray-700">
                  <button
                    className={`w-1/2 text-center px-4 py-2 text-sm font-medium transition flex items-center justify-center gap-2 ${
                      activeTab === "post"
                        ? "border-b-2 border-blue-500 text-blue-600 font-semibold"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                    onClick={() => setActiveTab("post")}
                  >
                    📝 {t("post") || "Post"}
                  </button>

                  <button
                    className={`w-1/2 text-center px-4 py-2 text-sm font-medium transition flex items-center justify-center gap-2 ${
                      activeTab === "question"
                        ? "border-b-2 border-orange-500 text-orange-600 font-semibold"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                    onClick={() => setActiveTab("question")}
                  >
                    ❓ {t("question") || "Question"}
                  </button>
                </div>
              </header>

              {/* Content */}
              <section className="flex-1 overflow-y-auto p-6">
                {/* ▼ タブの内容を切り替え */}
                {activeTab === "post" ? (
                  <PostForm
                    onSubmit={async (...args) => {
                      await onSubmit(...args);
                      onClose();
                    }}
                  />
                ) : (
                  <PostForm
                    onSubmit={async (...args) => {
                      await onSubmit(...args);
                      onClose();
                    }}
                    mode="question"
                  />
                )}
              </section>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
