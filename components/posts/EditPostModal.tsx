"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Portal from "@/components/common/Portal";
import PostEditorWrapper, {
  PostEditorWrapperRef,
} from "@/components/posts/PostEditorWrapper";
import { useTranslation } from "react-i18next";

interface EditPostModalProps {
  post: {
    _id: string;
    title?: string;
    content?: string;
  };
  onClose: () => void;
  onSave: (title: string, content: string) => Promise<void>;
}

export default function EditPostModal({
  post,
  onClose,
  onSave,
}: EditPostModalProps) {
  const { t } = useTranslation();

  const [title, setTitle] = useState(post.title ?? "");
  const [saving, setSaving] = useState(false);
  const [editorMounted, setEditorMounted] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const editorRef = useRef<PostEditorWrapperRef>(null);

  // ✅ Delay editor mount until modal is visible
  useEffect(() => {
    const timeout = setTimeout(() => setEditorMounted(true), 150);
    return () => clearTimeout(timeout);
  }, [post._id]);

  async function handleSave() {
    setSaving(true);
    const content = editorRef.current?.getHTML?.() ?? post.content ?? "";
    try {
      await onSave(title.trim(), content.trim());
      onClose();
      setResetKey((k) => k + 1);
    } catch (err) {
      console.error("❌ Save error:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Portal>
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center 
                     bg-black/40 dark:bg-black/60 backdrop-blur-sm"
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
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full max-w-4xl max-h-[80vh] flex flex-col 
                       bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl 
                       overflow-hidden border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">{t("editPost") || "Edit Post"}</h2>
              <button
                onClick={onClose}
                className="text-xl text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xl font-medium border border-gray-300 dark:border-gray-700
                           rounded-lg px-4 py-3 bg-transparent focus:outline-none"
                placeholder="Post title"
              />

              <div className="flex-1 overflow-auto border rounded-md dark:border-gray-700">
                {editorMounted && (
                  <PostEditorWrapper
                    key={resetKey}
                    ref={editorRef}
                    value={post.content ?? ""}
                  />
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600"
              >
                {t("cancel") || "Cancel"}
              </button>
              <button
                disabled={saving || !title.trim()}
                onClick={handleSave}
                className={`px-4 py-2 rounded-lg text-white ${
                  saving || !title.trim()
                    ? "bg-gray-400"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {saving ? "Saving..." : (t("saveChanges") || "Save Changes")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
}
