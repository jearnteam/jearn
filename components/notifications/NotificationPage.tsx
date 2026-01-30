"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { useNotificationContext } from "@/features/notifications/NotificationProvider";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";

/* ---------------------------------------------
 * TYPES
 * ------------------------------------------- */
export type Notification = {
  _id: string;
  type: "post_like" | "comment" | "mention" | "system" | "follow";
  postId?: string;

  lastActorName: string;
  lastActorId?: string;
  lastActorAvatar?: string;

  postPreview?: string;
  count?: number;

  createdAt: string;
  updatedAt?: string;
  read?: boolean;
};

/* ---------------------------------------------
 * PAGE
 * ------------------------------------------- */
export default function NotificationPage() {
  const mounted = useMounted();
  const { t } = useTranslation();
  const router = useRouter();

  const { items, fetchNotifications } = useNotificationContext();

  /* ---------------------------------------------
   * FETCH ON OPEN
   * ------------------------------------------- */
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  /* ---------------------------------------------
   * OVERLAY NAVIGATION (🔑 KEY FIX)
   * ------------------------------------------- */
  const openPostOverlay = useCallback(
    (postId: string) => {
      // mark this navigation as overlay-intent
      sessionStorage.setItem("from-navigation", "true");
      sessionStorage.setItem("restore-post-id", postId);

      router.push(`/posts/${postId}`);
    },
    [router]
  );

  if (!mounted) return null;

  const sortedItems = [...items].sort((a, b) => {
    const aTime = new Date(a.updatedAt ?? a.createdAt).getTime();
    const bTime = new Date(b.updatedAt ?? b.createdAt).getTime();
    return bTime - aTime;
  });

  if (!sortedItems.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Bell className="w-10 h-10 mb-3 opacity-50" />
        <p className="text-sm">{t("no_noti_yet") || "No notifications yet"}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-2 py-1">
      {sortedItems.map((n) => (
        <NotificationItem
          key={n._id}
          notification={n}
          onOpenPost={openPostOverlay}
        />
      ))}
    </div>
  );
}

/* ---------------------------------------------
 * ITEM
 * ------------------------------------------- */
function NotificationItem({
  notification,
  onOpenPost,
}: {
  notification: Notification;
  onOpenPost: (postId: string) => void;
}) {
  const mounted = useMounted();
  const { t } = useTranslation();

  const d = new Date(notification.updatedAt ?? notification.createdAt);

  const date = mounted
    ? d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "";

  function renderMessage() {
    switch (notification.type) {
      case "post_like": {
        const count = notification.count ?? 1;
        if (count > 1) {
          return `${notification.lastActorName} and ${count - 1} others ${
            t("upvote_noti") || "upvoted your post."
          }`;
        }
        return `${notification.lastActorName} ${
          t("upvote_noti") || "upvoted your post."
        }`;
      }

      case "mention":
        return `${notification.lastActorName} ${
          t("mention_noti") || "mentioned you!"
        }`;

      case "comment":
        return `${notification.lastActorName} ${
          t("comment_noti") || "commented on your post."
        }`;

      case "system":
        return (
          notification.postPreview ?? t("system_noti") ?? "System notification"
        );

      case "follow": {
        const count = notification.count ?? 1;

        if (count > 1) {
          return `${notification.lastActorName} and ${
            count - 1
          } others followed you`;
        }

        return `${notification.lastActorName} followed you`;
      }

      default:
        return t("notifications") || "Notification";
    }
  }

  const avatar = notification.lastActorAvatar ?? "/default-avatar.png";

  return (
    <div
      onClick={() => {
        if (notification.postId) {
          onOpenPost(notification.postId);
        }
      }}
      className={[
        "cursor-pointer flex gap-3 px-4 py-4 items-start border-b transition",
        "border-gray-200 dark:border-neutral-800",
        "hover:bg-neutral-50 dark:hover:bg-neutral-900/60",
        "bg-white dark:bg-neutral-950",
      ].join(" ")}
    >
      {/* AVATAR */}
      <img
        src={avatar}
        alt={notification.lastActorName}
        className="w-9 h-9 rounded-full flex-shrink-0 mt-0.5"
      />

      {/* CONTENT */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm leading-tight truncate">{renderMessage()}</p>
        </div>

        <div className="flex items-center justify-between gap-3 min-w-0">
          <p className="text-[12px] text-gray-500 leading-tight truncate">
            {notification.postPreview || ""}
          </p>

          <span className="text-[11px] text-gray-400 leading-tight whitespace-nowrap flex-shrink-0 text-right">
            {date}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------
 * HOOK
 * ------------------------------------------- */
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
