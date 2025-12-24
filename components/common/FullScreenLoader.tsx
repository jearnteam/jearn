"use client";

import { motion } from "framer-motion";
import LoadingOwl from "@/components/LoadingOwl";
import { useTranslation } from "react-i18next";

export default function FullScreenLoader({ text }: { text?: string }) {
  const { t } = useTranslation();

  return (
    <motion.div
      /* ❌ no fade-in */
      initial={false}
      animate={{ opacity: 1 }}
      /* ✅ fade-out allowed */
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="
        fixed
        inset-x-0
        top-[4.3rem]
        bottom-0
        z-50
        flex flex-col items-center justify-center
        bg-white dark:bg-neutral-900
      "
    >
      <div className="w-40 h-40">
        <LoadingOwl />
      </div>

      <p className="text-lg font-medium mt-4 text-gray-700 dark:text-gray-300">
        {text || t('loading') || 'Loading'}...
      </p>
    </motion.div>
  );
}
