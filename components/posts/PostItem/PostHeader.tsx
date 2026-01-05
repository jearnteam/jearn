"use client";

import Link from "next/link";
import dayjs from "@/lib/dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import i18n from "@/lib/i18n";
import PostMenu from "./PostMenu";
import { Network } from "lucide-react";
import type { Post } from "@/types/post";
import { useCurrentUser } from "@/hooks/useCurrentUser";

dayjs.extend(relativeTime);

export default function PostHeader({
  post,
  onEdit,
  onDelete,
  onToggleGraph,
}: {
  post: Post;
  onEdit?: (post: Post) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  onToggleGraph: () => void;
}) {
  const { user } = useCurrentUser();

  const isSelf = Boolean(
    user?._id && post.authorId && user._id === post.authorId
  );

  // ✅ NEVER force logout
  const profileHref = isSelf ? "/profile" : `/profile/${post.authorId}`;

  // ✅ Always safe avatar
  const avatar = post.authorAvatar ?? "/default-avatar.png";

  const authorName = post.authorName || "Unknown";

  return (
    <div className="flex justify-between mb-3">
      <Link href={profileHref} scroll={false}>
        <div className="flex items-center gap-3">
          <img
            src={avatar}
            onError={(e) => {
              e.currentTarget.src = "/default-avatar.png";
            }}
            className="w-8 h-8 rounded-full object-cover"
            loading="lazy"
            decoding="async"
            alt={`${authorName} avatar`}
          />
          <div>
            <p className="font-semibold">{authorName}</p>
            <p className="text-xs text-gray-500">
              {dayjs(post.createdAt).locale(i18n.language).fromNow()}
            </p>
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-1">
        <button onClick={onToggleGraph}>
          <Network className="text-blue-500" />
        </button>

        {/* Edit/Delete only handled inside PostMenu */}
        <PostMenu post={post} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  );
}
