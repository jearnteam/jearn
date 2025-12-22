"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Portal from "@/components/common/Portal";
import PostForm, { Category } from "@/components/posts/PostForm"; // ✅ 新しいPostFormを使用
import { useTranslation } from "react-i18next";
import type { Post } from "@/types/post";
import { PostTypes } from "@/types/post";

interface EditPostModalProps {
  post: Post;
  onClose: () => void;
  onSave: (
    title: string,
    content: string,
    categories: string[],
    tags: string[]
  ) => Promise<void>;
}

export default function EditPostModal({
  post,
  onClose,
  onSave,
}: EditPostModalProps) {
  const { t } = useTranslation();
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  // 編集モードでのみ全カテゴリを取得してフォームに渡す
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/categories");
        const list = await res.json();
        const mapped: Category[] = list.map((c: any) => ({
          id: c._id,
          label: c.label,
          jname: c.jname ?? c.label,
          score: 0,
        }));
        setAllCategories(mapped);
      } catch (err) {
        console.error("❌ Failed to fetch categories:", err);
      }
    })();
  }, []);

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
              <h2 className="text-xl font-semibold">{t("editPost")}</h2>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">✕</button>
            </div>

            {/* BODY: PostFormを再利用 */}
            <div className="flex-1 overflow-y-auto p-4">
              <PostForm
                // post.postType があればそれを使うが、なければ POST か QUESTION と推測
                mode={post.postType as any || PostTypes.POST} 
                initialTitle={post.title}
                initialContent={post.content}
                initialSelectedCategories={post.categories?.map((c) => c.id) ?? []}
                initialAvailableCategories={allCategories} // フェッチしたカテゴリを渡す
                submitLabel={t("saveChanges") || "Save Changes"}
                onCancel={onClose}
                onSubmit={async (data) => {
                  // onSaveのシグネチャに合わせてデータを展開
                  await onSave(data.title, data.content, data.categories, data.tags);
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