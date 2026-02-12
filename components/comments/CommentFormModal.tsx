"use client";

import { useEffect, useState } from "react";
import CommentForm from "@/components/comments/CommentForm";
import Portal from "@/components/common/Portal";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";

export default function CommentFormModal({
  parentId,
  onClose,
  onSubmitted,
}: {
  parentId: string;
  onClose: () => void;
  onSubmitted: (content: string) => void;
}) {
  const { t } = useTranslation();
  const [openCount] = useState(() => Date.now());

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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
              className="relative bg-white dark:bg-neutral-900 rounded-xl border border-blue-500/30 shadow-2xl flex flex-col overflow-hidden"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 dark:border-neutral-800">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  {t("writeComment")}
                </h2>
                <button
                  onClick={onClose}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-5">
                <CommentForm
                  key={openCount}
                  parentId={parentId}
                  onSubmitted={onSubmitted}
                  onCancel={onClose}
                  autoFocus
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
}