"use client";

import { Bell } from "lucide-react";
import { useNotifications } from "@/features/notifications/useNotifications";

/* ---------------------------------------------
 * TYPES
 * ------------------------------------------- */
export type Notification = {
  lastActorName: string;
  postPreview?: string;
  _id: string;
  type: "post_like" | "comment" | "mention" | "system";
  count?: number;
  updatedAt?: string;
  createdAt: string;
  read?: boolean;
};

/* ---------------------------------------------
 * PAGE
 * ------------------------------------------- */
export default function NotificationPage() {
  const { items, newIds } = useNotifications();

  const sortedItems = [...items].sort((a, b) => {
    const aIsNew = newIds.has(String(a._id));
    const bIsNew = newIds.has(String(b._id));

    // 1️⃣ New notifications first
    if (aIsNew !== bIsNew) {
      return aIsNew ? -1 : 1;
    }

    // 2️⃣ Newest first inside each group
    const aTime = new Date(a.updatedAt ?? a.createdAt).getTime();
    const bTime = new Date(b.updatedAt ?? b.createdAt).getTime();
    return bTime - aTime;
  });

  if (!sortedItems.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Bell className="w-10 h-10 mb-3 opacity-50" />
        <p className="text-sm">No notifications yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-2 py-1">
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
  notification: any;
  isNew: boolean;
}) {
  const d = new Date(notification.updatedAt ?? notification.createdAt);

  const date = d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  /* -------------------------------
   * MESSAGE BY TYPE
   * ----------------------------- */
  function renderMessage() {
    switch (notification.type) {
      case "post_like":
        if (notification.count && notification.count > 1) {
          return `${notification.lastActorName} and ${
            notification.count - 1
          } others upvoted your post`;
        }
        return `${notification.lastActorName} upvoted your post`;

      case "mention":
        return `${notification.lastActorName} mentioned you`;

      case "comment":
        return `${notification.lastActorName} commented on your post`;

      case "system":
        return notification.message ?? "System notification";

      default:
        return "Notification";
    }
  }

  return (
    <div
      className={[
        "flex gap-3 px-4 py-4 items-start border-b transition",
        "border-gray-200 dark:border-neutral-800",
        "hover:bg-neutral-50 dark:hover:bg-neutral-900/60",
        isNew
          ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900"
          : "bg-white dark:bg-neutral-950",
      ].join(" ")}
    >
      {/* AVATAR */}
      <img
        src={
          notification.lastActorAvatar ||
          (notification.lastActorId
            ? `https://cdn.jearn.site/avatars/${notification.lastActorId}.webp`
            : "/default-avatar.png")
        }
        className="w-9 h-9 rounded-full flex-shrink-0 mt-0.5"
      />

      {/* CONTENT */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {isNew && (
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            )}
            <p className="text-sm leading-snug truncate">{renderMessage()}</p>
          </div>

          <span className="text-xs text-gray-400 text-right leading-tight whitespace-nowrap">
            <div>{date}</div>
            <div>{time}</div>
          </span>
        </div>

        {notification.postPreview && (
          <p className="text-xs text-gray-500 mt-1.5 truncate">
            {notification.postPreview}
          </p>
        )}
      </div>
    </div>
  );
}
