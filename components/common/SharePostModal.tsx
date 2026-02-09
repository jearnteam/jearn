"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Link2, Check } from "lucide-react";
import Portal from "./Portal";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function SharePostModal({
  open,
  postUrl,
  onCancel,
}: {
  open: boolean;
  postUrl: string;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(postUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              <div className="flex items-center gap-3 mb-4">
                <Link2 size={24} className="text-blue-500 dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  {t("shareThisPost")}
                </h3>
              </div>

              <div className="bg-gray-100 dark:bg-neutral-800 text-sm px-3 py-2 rounded-md mb-4 break-all border border-gray-300 dark:border-neutral-700">
                {postUrl}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-neutral-800
                             text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-neutral-700"
                >
                  {t("cancel")}
                </button>

                <button
                  onClick={handleCopy}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700
                             flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check size={18} /> {t("copied")}
                    </>
                  ) : (
                    <>
                      <Link2 size={18} /> {t("copyLink")}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
