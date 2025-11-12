"use client";

import { motion, AnimatePresence } from "framer-motion";
import Portal from "@/components/common/Portal";
import PostForm, { PostFormProps } from "./PostForm";

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
              onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside
            >
              {/* Header */}
              <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold">Create Post</h2>
                <button
                  onClick={onClose}
                  className="text-xl hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </header>

              {/* Content */}
              <section className="flex-1 overflow-y-auto p-6">
                <PostForm
                  onSubmit={async (
                    title: string,
                    content: string,
                    authorId: string | null,
                    categories: string[]
                  ) => {
                    await onSubmit(title, content, authorId, categories);
                    onClose(); // ✅ auto-close after success
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
