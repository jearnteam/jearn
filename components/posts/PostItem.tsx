"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useEffect,
} from "react";
import {
  MoreVertical,
  ArrowBigUp,
  MessageCircle,
  Share2,
  Pencil,
  Trash2,
  Flag,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import dayjs from "@/lib/dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { MathRenderer } from "@/components/math/MathRenderer";
import Link from "next/link";
import SharePostModal from "@/components/common/SharePostModal";
import type { Post } from "@/types/post";
import { rememberTx } from "@/lib/recentTx";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import FullScreenPortal from "@/features/FullScreenPortal";

dayjs.extend(relativeTime);

interface PostItemProps {
  post: Post;
  onEdit?: (post: Post) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  onUpvote?: (id: string, userId: string, txId?: string) => Promise<any>;
  fullView?: boolean;
}

const LINE_HEIGHT = 20;
const COLLAPSED_LINES = 5;
const LINE_THRESHOLD = 10;

export default function PostItem({
  post,
  onEdit,
  onDelete,
  onUpvote,
  fullView = false,
}: PostItemProps) {
  const { user } = useCurrentUser();
  const userId = user?._id ?? "";
  const { t } = useTranslation();

  const [postState, setPostState] = useState(post);
  useEffect(() => setPostState(post), [post]);

  const hasUpvoted = userId && postState.upvoters?.includes(userId);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [expanded, setExpanded] = useState(fullView);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const [measureDone, setMeasureDone] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [shareOpen, setShareOpen] = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);

  const isAdminAuthor = postState.isAdmin === true;
  const defaultAvatar = "/default-avatar.png";

  const realAvatarUrl =
    postState.authorAvatar && postState.authorAvatar.startsWith("http")
      ? postState.authorAvatar
      : `/api/user/avatar/${postState.authorId}`;

  const [avatarLoaded, setAvatarLoaded] = useState(false);

  const [imageNode, setImageNode] = useState<HTMLImageElement | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = realAvatarUrl;
    img.onload = () => setAvatarLoaded(true);
    img.onerror = () => setAvatarLoaded(true);
  }, [realAvatarUrl]);

  useLayoutEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
      setMeasureDone(true);
    }
  }, [postState.content]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== "IMG") return;

      const original = target as HTMLImageElement;
      const clone = original.cloneNode(true) as HTMLImageElement;

      clone.removeAttribute("width");
      clone.removeAttribute("height");

      // Make image scale up/down
      clone.style.width = "100%";
      clone.style.height = "100%";
      clone.style.maxWidth = "100%";
      clone.style.maxHeight = "100%";
      clone.style.objectFit = "contain"; // critical
      clone.style.display = "block";

      setImageNode(clone);
    };

    el.addEventListener("click", handleImageClick);
    return () => el.removeEventListener("click", handleImageClick);
  }, []);

  const shouldTruncate =
    contentHeight && contentHeight > LINE_HEIGHT * LINE_THRESHOLD;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    async function checkReport() {
      if (!userId) return;
      try {
        const res = await fetch(
          `/api/reports/check?postId=${post._id}&userId=${userId}`
        );
        const data = await res.json();
        setAlreadyReported(data.alreadyReported);
      } catch {}
    }
    checkReport();
  }, [post._id, userId]);

  const toggleExpand = () => {
    setExpanded((prev) => {
      const next = !prev;

      if (prev && !next) {
        const el = document.getElementById(`post-${postState._id}`);
        if (el) {
          el.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }

      return next;
    });
  };

  const handleEdit = async () => {
    setMenuOpen(false);
    await onEdit?.(postState);
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    if (postState._id) await onDelete?.(postState._id);
  };

  const handleReport = async () => {
    if (!userId) return alert("Login required to report.");
    if (userId === String(postState.authorId))
      return alert("You can't report your own post.");
    if (alreadyReported) return alert("Already reported.");

    const reason = prompt("Why report?");
    if (!reason?.trim()) return;

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: postState._id,
          reporterId: userId,
          reason: reason.trim(),
        }),
      });

      if (res.status === 409) {
        alert("Already reported.");
        setAlreadyReported(true);
        return;
      }

      if (!res.ok) return alert("Failed to report.");

      alert("Report submitted.");
      setAlreadyReported(true);
    } catch {
      alert("Failed.");
    }
  };

  const [pending, setPending] = useState(false);

  const handleUpvote = useCallback(async () => {
    if (!userId || !postState._id || pending) return;
    setPending(true);

    const alreadyUpvoted = postState.upvoters?.includes(userId);
    const txId = crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    rememberTx(txId);

    setPostState((prev) => ({
      ...prev,
      upvoteCount: alreadyUpvoted ? prev.upvoteCount - 1 : prev.upvoteCount + 1,
      upvoters: alreadyUpvoted
        ? prev.upvoters.filter((id) => id !== userId)
        : [...prev.upvoters, userId],
    }));

    try {
      if (onUpvote) {
        await onUpvote(postState._id, userId, txId);
      } else {
        await fetch(`/api/posts/${postState._id}/upvote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, txId }),
        });
      }
    } catch {
      setPostState((prev) => ({
        ...prev,
        upvoteCount: alreadyUpvoted
          ? prev.upvoteCount + 1
          : prev.upvoteCount - 1,
        upvoters: alreadyUpvoted
          ? [...prev.upvoters, userId]
          : prev.upvoters.filter((id) => id !== userId),
      }));
    }

    setPending(false);
  }, [userId, postState._id, postState.upvoters, pending, onUpvote]);

  const isComment = !!post.parentId;
  const WrapperTag: any = fullView || isComment ? "div" : "li";

  const randomSpeed = 2 + Math.random() * 2;
  const randomHue = Math.floor(Math.random() * 360);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <WrapperTag
          id={`post-${postState._id}`}
          className={`relative ${
            isAdminAuthor ? "admin-post-glow" : ""
          } bg-white dark:bg-neutral-900 
            border border-gray-200 dark:border-gray-700 
            rounded-xl p-4 shadow-sm hover:shadow-md transition-all
            list-none`}
          style={{
            "--speed": `${randomSpeed}s`,
            "--glow-hue": randomHue,
            "--glow-base": `hsl(${randomHue}, 100%, 65%)`,
          }}
        >
          {/* HEADER */}
          <div className="flex items-center justify-between mb-3">
            <Link
              href={`/profile/${postState.authorId}`}
              scroll={false}
              onClick={() => {
                sessionStorage.setItem("lastPostId", postState._id);
                sessionStorage.setItem("lastScrollY", String(window.scrollY));
                sessionStorage.setItem(
                  "postListVisibleCount",
                  sessionStorage.getItem("postListVisibleCount") || "5"
                );
              }}
              className="flex items-center hover:opacity-80 transition"
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-300 dark:border-gray-700 mr-3">
                {!avatarLoaded && (
                  <img
                    src={defaultAvatar}
                    className="w-full h-full object-cover opacity-70"
                    alt="avatar"
                  />
                )}
                <img
                  src={realAvatarUrl}
                  className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-300 ${
                    avatarLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  alt="avatar"
                />
              </div>

              <div>
                <div className="flex gap-3">
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    {postState.authorName || ""}
                  </p>
                  <div className="flex items-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {postState.authorUserId ? ("@" + postState.authorUserId) : ""}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {dayjs(postState.createdAt).locale(i18n.language).fromNow()}
                </p>
              </div>
            </Link>

            {/* ⭐ RESTORED MENU (edit / delete / report) */}
            {userId && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800"
                >
                  <MoreVertical size={20} />
                </button>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="
                        absolute right-0 mt-2 w-44 z-20 
                        rounded-md overflow-hidden shadow-lg
                        bg-white dark:bg-neutral-800 
                        border border-gray-200 dark:border-gray-700"
                    >
                      {userId === String(postState.authorId) ? (
                        <>
                          <button
                            onClick={handleEdit}
                            className="
                              flex items-center gap-3 w-full px-4 py-2 text-left
                              hover:bg-gray-100 dark:hover:bg-neutral-700
                              text-gray-800 dark:text-gray-200"
                          >
                            <Pencil className="w-4 h-4 text-blue-500" />
                            <span>{t("edit") || "Edit"}</span>
                          </button>

                          <button
                            onClick={handleDelete}
                            className="
                              flex items-center gap-3 w-full px-4 py-2 text-left 
                              text-red-600 
                              hover:bg-gray-100 dark:hover:bg-neutral-700"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                            <span>{t("delete") || "Delete"}</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleReport}
                          disabled={alreadyReported}
                          className={`
                            flex items-center gap-3 w-full px-4 py-2 text-left text-yellow-600
                            ${
                              alreadyReported
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:bg-gray-100 dark:hover:bg-neutral-700"
                            }`}
                        >
                          <Flag className="w-4 h-4 text-yellow-500" />
                          <span>
                            {alreadyReported
                              ? t("reported") || "Reported"
                              : t("report") || "Report"}
                          </span>
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* TITLE */}
          {!isComment && (
            <h2 className="font-semibold text-lg text-gray-800 dark:text-gray-100 whitespace-normal break-words break-all">
              {postState.title}
            </h2>
          )}

          {/* CATEGORIES (unchanged) */}
          {Array.isArray(postState.categories) &&
            postState.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 mb-1">
                {postState.categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/category/${encodeURIComponent(cat.name)}`}
                    scroll={false}
                    className="text-xs px-2 py-1 rounded-md bg-blue-100 text-blue-700 
                      dark:bg-blue-600/50 dark:text-blue-200 
                      hover:bg-blue-200 dark:hover:bg-blue-800/60 transition"
                  >
                    {i18n.language === "ja"
                      ? cat.jname
                      : i18n.language === "my"
                      ? cat.myname
                      : cat.name}
                  </Link>
                ))}
              </div>
            )}

          {/* CONTENT */}
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height:
                fullView || expanded || !shouldTruncate
                  ? "auto"
                  : LINE_HEIGHT * COLLAPSED_LINES,
              opacity: 1,
            }}
            className="mt-2 overflow-hidden text-gray-900 dark:text-gray-100"
            ref={contentRef}
            style={{
              lineHeight: `${LINE_HEIGHT}px`,
              visibility: measureDone ? "visible" : "hidden",
            }}
          >
            <MathRenderer html={postState.content ?? ""} />
          </motion.div>

          {!fullView && !isComment && shouldTruncate && (
            <button
              onClick={toggleExpand}
              className="mt-2 text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              {expanded
                ? `${t("showLess") || "Show Less"} ▲`
                : `${t("showMore") || "Show More"} ▼`}
            </button>
          )}

          {/* FOOTER */}
          <div className="mt-4 flex space-x-6 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="flex-1 flex items-center gap-5">
              <button
                onClick={handleUpvote}
                disabled={pending}
                className={`flex items-center gap-1 ${
                  hasUpvoted
                    ? "text-blue-600 dark:text-blue-400"
                    : "hover:text-blue-600 dark:hover:text-blue-400"
                }`}
              >
                <ArrowBigUp size={18} /> {postState.upvoteCount ?? 0}
              </button>

              {!fullView && !isComment && (
                <Link
                  href={`/posts/${postState._id}#comments`}
                  scroll={false}
                  onClick={() => {
                    sessionStorage.setItem("restore-post-id", postState._id);
                    sessionStorage.setItem(
                      "restore-scroll-y",
                      String(window.scrollY)
                    );
                    sessionStorage.setItem(
                      "restore-visible-count",
                      sessionStorage.getItem("postListVisibleCount") || "5"
                    );
                  }}
                  className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <MessageCircle size={18} />
                  {postState.commentCount ?? 0}
                </Link>
              )}

              {!isComment && (
                <button
                  onClick={() => setShareOpen(true)}
                  className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <Share2 size={18} /> {t("share") || "Share"}
                </button>
              )}
            </div>
            <div className="">
              {postState.edited ? `(edited ${dayjs(postState.editedAt).locale(i18n.language).fromNow()})` : ""}
            </div>
          </div>
        </WrapperTag>
      </motion.div>

      <SharePostModal
        open={shareOpen}
        postUrl={`${
          typeof window !== "undefined" ? window.location.origin : ""
        }/posts/${postState._id}`}
        onCancel={() => setShareOpen(false)}
      />
      {/* ⭐ FULLSCREEN IMAGE VIEWER */}
      <FullScreenPortal>
        <AnimatePresence>
          {imageNode && (
            <motion.div
              key="image-viewer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="
          fixed inset-0 
          bg-black/70
          z-[999999999]
          flex items-center justify-center
          px-[10vw] py-[10vh]
          "
              onClick={() => setImageNode(null)}
            >
              <div
                ref={(container) => {
                  if (container && imageNode) {
                    container.innerHTML = "";
                    container.appendChild(imageNode);
                  }
                }}
                className="
            w-full h-full                    /* fill available space */
            flex items-center justify-center
          "
              />
            </motion.div>
          )}
        </AnimatePresence>
      </FullScreenPortal>
    </>
  );
}
