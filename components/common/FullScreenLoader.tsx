"use client";

import { motion } from "framer-motion";
import LoadingOwl from "@/components/LoadingOwl";
import { useTranslation } from "react-i18next";

export default function FullScreenLoader({ text }: { text?: string }) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-white
        dark:bg-neutral-900
      "
    >
      {/* ✅ 表示領域を明示 */}
      <div className="flex flex-col items-center justify-center">
        <div className="w-[200px] h-[200px] flex items-center justify-center">
          <LoadingOwl />
        </div>

        <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">
          {text || t("loading")}
          <AnimatedDots />
        </p>
      </div>
    </motion.div>
  );
}

function AnimatedDots() {
  return (
    <span className="inline-block w-[2ch] text-left">
      <span className="animate-dots"></span>
    </span>
  );
}
