"use client";

import { motion } from "framer-motion";
import { Undo, Redo, Eraser } from "lucide-react";
import { PostType, PostTypes } from "@/types/post";
import { TFunction } from "i18next";

type Props = {
  user: any;
  avatarUrl: string | null;
  t: TFunction;
  mode: PostType;
  loading: boolean;
  submitting: boolean;

  categories: any[];
  contentChanged: boolean;
  selected: string[];

  handleUndo: () => void;
  handleRedo: () => void;
  handleClearContent: () => void;
  handleCheckCategories: () => void;
};

export default function PostFormFooter({
  user,
  avatarUrl,
  t,
  mode,
  loading,
  submitting,
  categories,
  contentChanged,
  selected,
  handleUndo,
  handleRedo,
  handleClearContent,
  handleCheckCategories,
}: Props) {
  return (
    <div className="sticky bottom-0 p-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Left side */}
        <div className="flex items-center gap-2 text-sm min-w-0">
          {user ? (
            <img
              src={avatarUrl!}
              className="w-8 h-8 rounded-full border border-gray-300 dark:border-neutral-700 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-300 dark:bg-neutral-700 animate-pulse rounded-full shrink-0" />
          )}

          <span className="truncate">
            {t("postingAsBefore")}{" "}
            {user ? (
              <strong>{user.name}</strong>
            ) : (
              <span className="inline-block w-24 h-5 bg-gray-300 dark:bg-neutral-700 animate-pulse rounded-md"></span>
            )}{" "}
            {t("postingAsAfter")}
          </span>
        </div>
        {/* Right side */}
        <div className="flex flex-wrap gap-2 sm:gap-3 items-center justify-end">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleUndo}
            className="px-2 py-2 rounded-lg bg-gray-200 dark:bg-gray-700"
          >
            <Undo size={16} />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleRedo}
            className="px-2 py-2 rounded-lg bg-gray-200 dark:bg-gray-700"
          >
            <Redo size={16} />
          </button>

          <button
            type="button"
            onClick={handleClearContent}
            className="px-2 py-2 rounded-lg bg-red-100 text-red-600"
          >
            <Eraser size={16} />
          </button>

          {(categories.length === 0 || contentChanged) &&
          mode !== PostTypes.ANSWER ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={handleCheckCategories}
              className="px-4 py-2 rounded-lg bg-yellow-500 text-white"
            >
              {t("checkCategories")}
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.93 }}
              type="submit"
              disabled={
                submitting ||
                loading ||
                (mode !== PostTypes.ANSWER &&
                  mode !== PostTypes.VIDEO &&
                  selected.length === 0)
              }
              className="px-4 py-2 rounded-lg bg-blue-600 text-white"
            >
              {t("submit")}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
