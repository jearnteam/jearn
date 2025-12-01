"use client";

import { motion } from "framer-motion";
import LoadingOwl from "@/components/LoadingOwl";
import { useTranslation } from "react-i18next";

export default function FullScreenLoader({ text }: { text?: string }) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="
        fixed inset-0 z-50 
        flex flex-col items-center justify-center
        bg-white/80 dark:bg-neutral-900/80
      "
    >
      <div className="w-40 h-40">
        <LoadingOwl />
      </div>

      <p className="text-lg font-medium mt-4 text-gray-700 dark:text-gray-300">
        {text || t("loading") || "Loading"}...
      </p>
    </motion.div>
  );
}
