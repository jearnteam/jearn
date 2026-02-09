// components/comments/EditCommentModal.tsx
"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Portal from "@/components/common/Portal"; // ✅ Use the same working portal
import PostEditorWrapper, { PostEditorWrapperRef } from "@/components/posts/PostEditorWrapper";
import { useTranslation } from "react-i18next";

interface EditCommentModalProps {
  comment: { _id: string; content: string };
  onClose: () => void;
  onSave: (content: string) => Promise<void>;
}

export default function EditCommentModal({ comment, onClose, onSave }: EditCommentModalProps) {
  const {t} = useTranslation();
  
  const editorRef = useRef<PostEditorWrapperRef>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const content = editorRef.current?.getHTML?.() ?? comment.content;
    try {
      await onSave(content.trim());
      onClose();
    } catch (e) {
      console.error("❌ Save comment failed:", e);
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
          // ⚠️ REMOVE this to prevent closing on outside click
          // onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full max-w-xl max-h-[70vh] flex flex-col 
                       bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl 
                       overflow-hidden border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()} // ✅ Prevent click inside from closing modal
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{t("editComment")}</h2>
              <button onClick={onClose} className="text-lg hover:text-gray-600">✕</button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              <PostEditorWrapper ref={editorRef} value={comment.content} />{/* TODO: */}
            </div>

            <div className="p-4 flex justify-end gap-2 border-t">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-md bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600"
              >
                {t("cancel")}
              </button>
              <button
                disabled={saving}
                onClick={handleSave}
                className={`px-4 py-2 rounded-md text-white ${
                  saving ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
}
