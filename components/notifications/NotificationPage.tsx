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

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Bell className="w-10 h-10 mb-3 opacity-50" />
        <p className="text-sm">No notifications yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-neutral-800">
      {items.map((n) => (
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
  const date = new Date(
    notification.updatedAt ?? notification.createdAt
  ).toLocaleString();

  return (
    <div
      className={[
        "flex gap-3 px-4 py-3 transition",
        "hover:bg-neutral-100 dark:hover:bg-neutral-900",
        isNew ? "bg-blue-50/60 dark:bg-blue-950/25" : "",
      ].join(" ")}
    >
      <img
        src={
          notification.lastActorAvatar ||
          `https://cdn.jearn.site/avatars/${notification.lastActorId}.webp`
        }
        className="w-9 h-9 rounded-full flex-shrink-0"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {isNew && (
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            )}
            <p className="text-sm truncate">
              {notification.count === 1
                ? `${notification.lastActorName} upvoted your post`
                : `${notification.lastActorName} and ${
                    notification.count - 1
                  } others upvoted your post`}
            </p>
          </div>

          <span className="text-xs text-gray-400 whitespace-nowrap">
            {date}
          </span>
        </div>

        <p className="text-xs text-gray-500 mt-1 truncate">
          {notification.postPreview ?? ""}
        </p>
      </div>
    </div>
  );
}
