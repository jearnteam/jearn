"use client";

import { MathRenderer } from "@/components/math/MathRenderer";
import { Post } from "@/features/posts/hooks/usePosts";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ArrowBigUp, MessageCircle, Share2 } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useEffect, useState, useRef } from "react";

dayjs.extend(relativeTime);

interface UpvoteResponse {
  ok: boolean;
  error?: string;
  action?: "added" | "removed";
}

interface Props {
  post: Post;
  onEdit: (id: string, title?: string, content?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpvote: (id: string, userId: string) => Promise<UpvoteResponse>;
}

export default function PostItem({ post, onEdit, onDelete, onUpvote }: Props) {
  const { user, loading: userLoading } = useCurrentUser();
  const userId = user?._id || user?.email || "guest";

  const [upvoted, setUpvoted] = useState(false);
  const [upvotes, setUpvotes] = useState(post.upvoteCount || 0);
  const [loading, setLoading] = useState(false);

  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Handle upvoted state based on current user
  useEffect(() => {
    if (!userLoading && user) {
      setUpvoted(post.upvoters?.includes(userId) || false);
    }
  }, [userLoading, user, post.upvoters, userId]);

  // Check if content overflows
  useEffect(() => {
    const el = contentRef.current;
    if (el) {
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight || "20");
      const maxVisibleHeight = lineHeight * 5;
      setIsOverflowing(el.scrollHeight > maxVisibleHeight);
    }
  }, [post.content]);

  const handleUpvote = async () => {
    if (!user) {
      alert("You must be logged in to upvote.");
      return;
    }
    if (loading) return;
    setLoading(true);

    try {
      const res = await onUpvote(post._id, userId);
      if (res.ok) {
        if (res.action === "added") {
          setUpvotes((prev) => prev + 1);
          setUpvoted(true);
        } else if (res.action === "removed") {
          setUpvotes((prev) => Math.max(0, prev - 1));
          setUpvoted(false);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const displayName = post.authorName || "Anonymous";
  const displayAvatar =
    post.authorAvatar ||
    (post.authorId ? `/api/user/avatar/${post.authorId}` : null);
  const fallbackInitial = displayName?.[0]?.toUpperCase() || "👤";

  return (
    <li className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-transform duration-300">
      {/* 🧑 Author */}
      <div className="flex items-center mb-3">
        {displayAvatar ? (
          <img
            src={displayAvatar}
            alt={displayName}
            className="w-10 h-10 rounded-full object-cover mr-3 border"
            onError={(e) => (e.currentTarget.src = "/default-avatar.png")}
          />
        ) : (
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 mr-3">
            {fallbackInitial}
          </div>
        )}
        <div>
          <p className="font-semibold text-gray-800 leading-tight">
            {displayName}
          </p>
          <p className="text-xs text-gray-500">
            {post.createdAt ? dayjs(post.createdAt).fromNow() : "Just now"}
          </p>
        </div>
      </div>

      {/* 📝 Title + Edit/Delete */}
      <div className="flex justify-between items-start mb-2">
        <h2 className="font-semibold text-lg text-gray-800 break-words">
          {post.title || "Untitled"}
        </h2>
        <div className="space-x-2 shrink-0">
          <button onClick={() => onEdit(post._id)} className="text-blue-600">
            ✏️ Edit
          </button>
          <button onClick={() => onDelete(post._id)} className="text-red-600">
            🗑 Delete
          </button>
        </div>
      </div>

      {/* 📄 Content */}
      {post.content && (
        <div className="relative mt-2">
          <div
            ref={contentRef}
            className={`prose max-w-none text-gray-700 leading-relaxed transition-all duration-300 overflow-hidden ${
              expanded ? "max-h-none" : "max-h-[7.5rem] pb-6"
            }`}
          >
            <MathRenderer html={post.content} />
          </div>

          {!expanded && isOverflowing && (
            <div className="absolute bottom-6 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
          )}

          {isOverflowing && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 text-blue-600 text-sm font-medium hover:underline"
            >
              {expanded ? "Show less ▲" : "Show more ▼"}
            </button>
          )}
        </div>
      )}

      {/* 🦶 Footer */}
      <div className="mt-4 flex items-center text-gray-500 text-sm space-x-6 border-t pt-3">
        <button
          onClick={handleUpvote}
          disabled={loading}
          className={`flex items-center gap-1 transition-colors ${
            loading ? "opacity-50 cursor-wait" : "hover:text-blue-600"
          } ${upvoted ? "text-blue-600" : ""}`}
        >
          <ArrowBigUp size={18} />
          <span>{upvotes}</span>
        </button>
        <button className="flex items-center gap-1 hover:text-blue-600">
          <MessageCircle size={18} /> <span>Comment</span>
        </button>
        <button className="flex items-center gap-1 hover:text-blue-600">
          <Share2 size={18} /> <span>Share</span>
        </button>
      </div>
    </li>
  );
}
