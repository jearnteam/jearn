"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "@/features/notifications/useNotifications";
import { useTranslation } from "react-i18next";

/* ---------------------------------------------
 * TYPES
 * ------------------------------------------- */
export type Notification = {
  _id: string;
  type: "post_like" | "comment" | "mention" | "system";
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
  const { items, newIds } = useNotifications();

  // ⛔ Prevent hydration mismatch completely
  if (!mounted) return null;

  const sortedItems = [...items].sort((a, b) => {
    const aIsNew = newIds.has(String(a._id));
    const bIsNew = newIds.has(String(b._id));

    if (aIsNew !== bIsNew) {
      return aIsNew ? -1 : 1;
    }

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
    <div className="flex flex-col px-2 py-1" >
      {sortedItems.map((n) => (
        <NotificationItem
          key={n._id}
          notification={n}
          isNew={newIds.has(String(n._id))}
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
  isNew,
}: {
  notification: Notification;
  isNew: boolean;
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

      default:
        return t("notifications") || "Notification";
    }
  }

  const avatar = notification.lastActorAvatar ?? "/default-avatar.png";

  return (
    <div
      onClick={() => {
        if (notification.postId) {
          window.location.href = `/posts/${notification.postId}`;
        }
      }}
      className={[
        "cursor-pointer flex gap-3 px-4 py-4 items-start border-b transition",
        "border-gray-200 dark:border-neutral-800",
        "hover:bg-neutral-50 dark:hover:bg-neutral-900/60",
        isNew
          ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900"
          : "bg-white dark:bg-neutral-950",
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
          {isNew && (
            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
          )}
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
