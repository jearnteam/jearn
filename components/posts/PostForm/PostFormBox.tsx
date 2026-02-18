"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Portal from "@/components/common/Portal";
import PostForm from "./PostForm";
import type { PostFormHandle } from "./PostForm";
import { useTranslation } from "react-i18next";
import { PostType, PostTypes } from "@/types/post";
import {
  Pencil,
  BadgeQuestionMark,
  Video,
  ImagePlus,
  BarChart3,
  MessageCircleOff,
  MessageCircle,
} from "lucide-react";

const POST_TYPE_OPTIONS = [
  {
    type: PostTypes.POST,
    label: "Post",
    Icon: Pencil,
  },
  {
    type: PostTypes.QUESTION,
    label: "Question",
    Icon: BadgeQuestionMark,
  },
  { type: PostTypes.POLL, label: "Poll", Icon: BarChart3 },
  {
    type: PostTypes.VIDEO,
    label: "Video",
    Icon: Video,
  },
];

type PostFormMode =
  | typeof PostTypes.POST
  | typeof PostTypes.QUESTION
  | typeof PostTypes.POLL
  | typeof PostTypes.VIDEO
  | typeof PostTypes.ANSWER;

const POST_TYPE_GLOW: Record<PostFormMode, string> = {
  [PostTypes.POST]:
    "border-blue-500/40 shadow-[0_0_0_1px_rgba(59,130,246,0.4),0_0_30px_rgba(59,130,246,0.15)]",
  [PostTypes.QUESTION]:
    "border-red-500/40 shadow-[0_0_0_1px_rgba(249,115,22,0.4),0_0_30px_rgba(249,115,22,0.15)]",
  [PostTypes.POLL]:
    "border-emerald-500/40 shadow-[0_0_0_1px_rgba(64,255,22,0.4),0_0_30px_rgba(249,115,22,0.15)]",
  [PostTypes.VIDEO]:
    "border-purple-500/40 shadow-[0_0_0_1px_rgba(168,85,247,0.4),0_0_30px_rgba(168,85,247,0.15)]",
  [PostTypes.ANSWER]:
    "border-yellow-500/40 shadow-[0_0_0_1px_rgba(200,200,22,0.4),0_0_30px_rgba(16,185,129,0.15)]",
};

const POST_TYPE_GLOW_BG: Record<PostFormMode, string> = {
  [PostTypes.POST]: "bg-blue-500/40",
  [PostTypes.QUESTION]: "bg-red-500/40",
  [PostTypes.POLL]: "bg-emerald-500/40",
  [PostTypes.VIDEO]: "bg-purple-500/40",
  [PostTypes.ANSWER]: "bg-yellow-500/40",
};

/* ===================== Component ===================== */

export default function PostFormBox({
  open,
  onClose,
  onSubmit,
  type = PostTypes.POST,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    postType: PostType,
    title: string,
    content: string,
    authorId: string | null,
    categories: string[],
    mentionedUserIds: string[],
    tags: string[],
    references?: string[],
    poll?: any,
    video?: any,
    commentDisabled?: boolean
  ) => Promise<void>;
  type?: PostFormMode;
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<PostFormMode>(type);
  const [openTypeMenu, setOpenTypeMenu] = useState(false);
  const [commentDisabled, setCommentDisabled] = useState(false);
  const postFormRef = useRef<PostFormHandle>(null);

  useEffect(() => {
    if (open) setMode(type);
  }, [open, type]);

  useEffect(() => {
    if (!open) setOpenTypeMenu(false);
  }, [open]);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[50] bg-black/50 backdrop-blur-sm
                       flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Center wrapper controls glow size */}
            <div className="relative w-full max-w-4xl px-4">
              {/* Halo glow (ONLY around modal) */}
              <div
                className={`
                  absolute -inset-10
                  rounded-xl
                  blur-[90px]
                  opacity-60
                  pointer-events-none
                  ${POST_TYPE_GLOW_BG[mode]}
                `}
              />

              {/* Modal box */}
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                transition={{ duration: 0.25 }}
                onClick={(e) => e.stopPropagation()}
                className={`
                  relative
                  bg-white dark:bg-neutral-900
                  rounded-md
                  border
                  flex flex-col
                  max-h-[80vh]
                  transition-[border-color,box-shadow] duration-300
                  ${POST_TYPE_GLOW[mode]}
                `}
              >
                {/* ================= Header ================= */}
                <header className="relative p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    {mode !== PostTypes.ANSWER && (
                      <div className="relative">
                        <button
                          onClick={() => setOpenTypeMenu((v) => !v)}
                          className="flex items-center gap-2 px-3 py-1.5
                                     text-sm font-medium rounded-md border
                                     hover:bg-gray-100 dark:hover:bg-neutral-800"
                        >
                          {(() => {
                            const Icon = POST_TYPE_OPTIONS.find(
                              (o) => o.type === mode
                            )?.Icon;
                            return Icon ? <Icon size={16} /> : null;
                          })()}
                          <span>
                            {
                              POST_TYPE_OPTIONS.find((o) => o.type === mode)
                                ?.label
                            }
                          </span>
                          <span className="text-xs">▾</span>
                        </button>

                        <AnimatePresence>
                          {openTypeMenu && (
                            <motion.div
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              className="absolute left-0 mt-2 w-40
                                         bg-white dark:bg-neutral-900
                                         border rounded-md shadow-lg z-50"
                            >
                              {POST_TYPE_OPTIONS.map((opt) => (
                                <button
                                  key={opt.type}
                                  onClick={() => {
                                    setMode(opt.type);
                                    setOpenTypeMenu(false);
                                  }}
                                  className="w-full px-3 py-2 text-sm
                                             flex gap-2 hover:bg-gray-100
                                             dark:hover:bg-neutral-800"
                                >
                                  <opt.Icon size={16} />
                                  <span>{opt.label}</span>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {!(mode === PostTypes.VIDEO || mode === PostTypes.POLL) && (
                      <button
                        type="button"
                        onClick={() => postFormRef.current?.insertImage()}
                        className="w-9 h-9 flex items-center justify-center
                          rounded-md border
                          hover:bg-gray-100 dark:hover:bg-neutral-800"
                        title="Insert image"
                      >
                        <ImagePlus size={16} />
                      </button>
                    )}

                    {mode !== PostTypes.QUESTION && (
                      <button
                        type="button"
                        onClick={() => setCommentDisabled((prev) => !prev)}
                        className={`w-9 h-9 flex items-center justify-center
                                   rounded-md border transition-colors
                                   ${
                                     commentDisabled
                                       ? "border-red-500/50 text-red-500 bg-red-50 dark:bg-red-500/10"
                                       : "hover:bg-gray-100 dark:hover:bg-neutral-800 border-gray-200 dark:border-neutral-700"
                                   }`}
                        title={
                          commentDisabled
                            ? "Enable comments"
                            : "Disable comments"
                        }
                      >
                        {commentDisabled ? (
                          <MessageCircleOff size={16} />
                        ) : (
                          <MessageCircle size={16} />
                        )}
                      </button>
                    )}

                    {/* Center title */}
                    <h2
                      className="absolute left-1/2 top-1/2
                                   -translate-x-1/2 -translate-y-1/2
                                   text-lg font-semibold pointer-events-none"
                    >
                      {mode === PostTypes.POST
                        ? t("createPost")
                        : mode === PostTypes.QUESTION
                        ? "Ask Question"
                        : mode === PostTypes.VIDEO
                        ? "Upload Video"
                        : mode === PostTypes.POLL
                        ? "Create Poll"
                        : ""}
                    </h2>

                    <button
                      onClick={onClose}
                      className="ml-auto text-xl hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                </header>

                {/* ================= Content ================= */}
                <section className="flex-1 min-h-0 flex flex-col">
                  <PostForm
                    key={mode}
                    ref={postFormRef}
                    mode={mode}
                    onSubmit={async (data) => {
                      await onSubmit(
                        data.postType,
                        data.title,
                        data.content,
                        data.authorId,
                        data.categories,
                        data.mentionedUserIds,
                        data.tags,
                        data.references,
                        data.poll,
                        data.video,
                        commentDisabled
                      );
                    }}
                    onSuccess={() => {
                      onClose();
                      setMode(type);
                    }}
                  />
                </section>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
