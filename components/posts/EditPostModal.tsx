"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Portal from "@/components/common/Portal";
import PostForm, { Category } from "@/components/posts/PostForm/PostForm";
import { useTranslation } from "react-i18next";
import type { Post } from "@/types/post";
import { PostTypes, PostType } from "@/types/post";
import { MessageCircle, MessageCircleOff } from "lucide-react";

interface EditPostModalProps {
  post: Post;
  onClose: () => void;
  onSave: (
    title: string,
    content: string,
    categories: string[],
    tags: string[],
    commentDisabled?: boolean
  ) => Promise<void>;
}

export default function EditPostModal({
  post,
  onClose,
  onSave,
}: EditPostModalProps) {
  const { t } = useTranslation();
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [commentDisabled, setCommentDisabled] = useState(
    post.commentDisabled ?? false
  );

  /* -------------------------------------------------
   * Resolve safe post type
   * ------------------------------------------------- */
  const mode: PostType =
    post.postType === PostTypes.POST ||
    post.postType === PostTypes.QUESTION ||
    post.postType === PostTypes.ANSWER
      ? post.postType
      : PostTypes.POST;

  /* -------------------------------------------------
   * Load categories (edit-only)
   * ------------------------------------------------- */
  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      try {
        const res = await fetch("/api/categories");
        const list: unknown[] = await res.json();

        if (!mounted) return;

        const mapped: Category[] = list.map((c) => {
          const cat = c as {
            _id: string;
            label: string;
            jname?: string;
          };

          return {
            id: cat._id,
            label: cat.label,
            jname: cat.jname ?? cat.label,
            score: 0,
          };
        });

        setAllCategories(mapped);
      } catch (err) {
        console.error("❌ Failed to fetch categories:", err);
      }
    }

    loadCategories();
    return () => {
      mounted = false;
    };
  }, []);

  /* -------------------------------------------------
   * Render
   * ------------------------------------------------- */
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
              {
                <button
                  type="button"
                  onClick={() => setCommentDisabled((prev) => !prev)}
                  className={`w-9 h-9 flex items-center justify-center
                               rounded-md border transition-colors
                               ${
                                 commentDisabled
                                   ? "border-red-500/50 text-red-500 bg-red-50 dark:bg-red-500/10"
                                   : "hover:bg-gray-100 dark:hover:bg-neutral-800 border-gray-200 dark:border-neutral-700"
                               }`}
                  title={
                    commentDisabled ? "Enable comments" : "Disable comments"
                  }
                >
                  {commentDisabled ? (
                    <MessageCircleOff size={16} />
                  ) : (
                    <MessageCircle size={16} />
                  )}
                </button>
              }
              <h2 className="text-xl font-semibold">{t("editPost")}</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            {/* BODY */}
            <div className="flex-1 overflow-y-auto p-4">
              <PostForm
                mode={mode}
                initialTitle={post.title}
                initialContent={post.content}
                initialSelectedCategories={
                  post.categories?.map((c) => c.id) ?? []
                }
                initialAvailableCategories={allCategories}
                submitLabel={t("saveChanges")}
                onCancel={onClose}
                onSubmit={async (data) => {
                  await onSave(
                    data.title,
                    data.content,
                    data.categories,
                    data.tags,
                    commentDisabled
                  );

                  onClose();
                }}
                isEdit={true}
              />
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
}
