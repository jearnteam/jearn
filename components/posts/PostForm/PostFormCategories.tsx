"use client";

import { motion, AnimatePresence } from "framer-motion";
import i18n from "@/lib/i18n";
import { TFunction } from "i18next";

type Category = {
  id: string;
  label: string;
  jname?: string;
  score: number;
};

type Props = {
  visibleCats: Category[];
  selected: string[];
  handleSelectCategory: (id: string) => void;
  visibleCount: number;
  setVisibleCount: React.Dispatch<React.SetStateAction<number>>;
  orderedLength: number;
  animatingLayout: boolean;
  setAnimatingLayout: (v: boolean) => void;
  t: TFunction;
};

export default function PostFormCategories({
  visibleCats,
  selected,
  handleSelectCategory,
  visibleCount,
  setVisibleCount,
  orderedLength,
  animatingLayout,
  setAnimatingLayout,
  t,
}: Props) {
  return (
    <motion.div
      key="cat-list"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.25 }}
      className="space-y-3"
      onLayoutAnimationStart={() => setAnimatingLayout(true)}
      onLayoutAnimationComplete={() => setAnimatingLayout(false)}
    >
      <motion.div layout className="overflow-hidden">
        <motion.div
          layout
          className="flex flex-wrap gap-3"
          transition={{
            layout: { duration: 0.35, ease: "easeInOut" },
          }}
        >
          {visibleCats.map((cat) => {
            const isSelected = selected.includes(cat.id);

            return (
              <motion.div
                key={cat.label}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col"
              >
                <motion.button
                  type="button"
                  layout
                  whileTap={{ scale: 0.92 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                    isSelected
                      ? "bg-blue-600 text-white shadow"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}
                >
                  {i18n.language === "ja" ? cat.jname : cat.label}
                </motion.button>

                <div className="w-full h-1.5 bg-gray-300 dark:bg-neutral-800 mt-1 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.score * 100}%` }}
                    transition={{ duration: 0.6 }}
                    className="h-full bg-blue-500 dark:bg-blue-400"
                  />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>

      {!animatingLayout && (
        <motion.div layout className="flex gap-4 text-sm">
          {visibleCount < orderedLength && (
            <button
              type="button"
              onClick={() => setVisibleCount((v) => v + 5)}
              className="text-blue-500 hover:underline"
            >
              {t("showMore")}
            </button>
          )}

          {visibleCount > 5 && (
            <button
              type="button"
              onClick={() => setVisibleCount(5)}
              className="text-blue-500 hover:underline"
            >
              {t("showLess")}
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
