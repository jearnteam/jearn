"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MoreVertical, Pencil, Trash2, Flag } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "react-i18next";
import type { Post } from "@/types/post";

export default function PostMenu({
  post,
  onEdit,
  onDelete,
}: {
  post: Post;
  onEdit?: (post: Post) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
}) {
  const { user } = useCurrentUser();
  const userId = user?._id ?? "";
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!userId) return null;

  const isAuthor = userId === String(post.authorId);

  async function handleEdit() {
    setOpen(false);
    await onEdit?.(post);
  }

  async function handleDelete() {
    setOpen(false);
    if (post._id) await onDelete?.(post._id);
  }

  async function handleReport() {
    if (isAuthor) return alert("You can't report your own post.");
    const reason = prompt("Why report?");
    if (!reason?.trim()) return;

    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId: post._id,
        reporterId: userId,
        reason: reason.trim(),
      }),
    });

    alert("Report submitted.");
    setOpen(false);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800"
      >
        <MoreVertical size={20} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute right-0 mt-2 w-44 z-20 rounded-md overflow-hidden
                       shadow-lg bg-white dark:bg-neutral-800
                       border border-gray-200 dark:border-gray-700"
          >
            {isAuthor ? (
              <>
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-3 w-full px-4 py-2
                             hover:bg-gray-100 dark:hover:bg-neutral-700"
                >
                  <Pencil className="w-4 h-4 text-blue-500" />
                  <span>{t("edit")}</span>
                </button>

                <button
                  onClick={handleDelete}
                  className="flex items-center gap-3 w-full px-4 py-2
                             text-red-600 hover:bg-gray-100 dark:hover:bg-neutral-700"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                  <span>{t("delete")}</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleReport}
                className="flex items-center gap-3 w-full px-4 py-2
                           text-yellow-600 hover:bg-gray-100 dark:hover:bg-neutral-700"
              >
                <Flag className="w-4 h-4 text-yellow-500" />
                <span>{t("report")}</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
