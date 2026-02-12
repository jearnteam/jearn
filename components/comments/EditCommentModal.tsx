"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Portal from "@/components/common/Portal";
import PostEditorWrapper, {
  PostEditorWrapperRef,
} from "@/components/posts/PostForm/PostEditorWrapper";
import { useTranslation } from "react-i18next";

interface EditCommentModalProps {
  comment: { _id: string; content: string };
  onClose: () => void;
  onSave: (content: string) => Promise<void>;
}

export default function EditCommentModal({
  comment,
  onClose,
  onSave,
}: EditCommentModalProps) {
  const { t } = useTranslation();
  const editorRef = useRef<PostEditorWrapperRef>(null);
  const [saving, setSaving] = useState(false);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSave() {
    setSaving(true);
    // エディタから最新のHTMLを取得。取得できない場合は元の内容をフォールバック
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
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {/* Center Wrapper */}
          <div className="relative w-full max-w-2xl">
            
            {/* Glow Effect (Blue for Comment) */}
            <div className="absolute -inset-10 rounded-xl blur-[80px] opacity-40 bg-blue-500/30 pointer-events-none" />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="
                relative bg-white dark:bg-neutral-900 
                rounded-xl border border-blue-500/30 shadow-2xl 
                flex flex-col max-h-[80vh] overflow-hidden
              "
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 dark:border-neutral-800">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  {t("editComment")}
                </h2>
                <button
                  onClick={onClose}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition text-gray-500"
                >
                  ✕
                </button>
              </div>

              {/* Editor Body */}
              <div className="flex-1 p-5 overflow-y-auto">
                <div className="border rounded-lg overflow-hidden bg-gray-50 dark:bg-black/20 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                  <PostEditorWrapper
                    ref={editorRef}
                    // initialValue は機能していないため、onReady でセットする
                    placeholder={t("writeComment")}
                    compact
                    onReady={() => {
                      if (editorRef.current?.editor) {
                        // エディタの準備ができたらコンテンツを注入
                        editorRef.current.editor.commands.setContent(
                          comment.content
                        );
                        // フォーカスしてカーソルを末尾へ移動
                        requestAnimationFrame(() => {
                          editorRef.current?.focus();
                        });
                      }
                    }}
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-5 py-4 border-t border-gray-100 dark:border-neutral-800 flex justify-end gap-3 bg-gray-50/50 dark:bg-neutral-900/50">
                <button
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-neutral-800 transition"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium text-white transition shadow-sm
                    ${saving 
                      ? "bg-gray-400 cursor-not-allowed" 
                      : "bg-blue-600 hover:bg-blue-700 hover:shadow-md"
                    }
                  `}
                >
                  {saving ? "Saving..." : t("saveChanges") || "Save"}
                </button>
              </div>

            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
}