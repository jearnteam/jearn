"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import Portal from "./Portal";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function DeleteConfirmModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const {t} = useTranslation();

  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center
                       bg-black/50 dark:bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl p-6 w-[90%] max-w-md
                         border border-gray-200 dark:border-neutral-700"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-4 text-red-500 dark:text-red-400">
                <AlertTriangle size={24} />
                <h3 className="text-lg font-semibold">{t("deletePost") || "Delete this post?"}</h3>
              </div>

              <p className="text-gray-700 dark:text-gray-300 mb-6">
                {t("deletePostDesc") || "This action cannot be undone. Are you sure you want to permanently delete this post?"}
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={onCancel}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-neutral-800 
                             text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-neutral-700
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("cancel") || "Cancel"}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700
                             disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isDeleting && (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  )}
                  {isDeleting ? "Deleting..." : (t("delete") || "Delete")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
