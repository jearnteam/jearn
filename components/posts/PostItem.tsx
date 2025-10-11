"use client";

import { MathRenderer } from "@/components/math/MathRenderer";
import { Post } from "@/features/posts/hooks/usePosts";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useState } from "react";
import { ArrowBigUp, MessageCircle, Share2 } from "lucide-react";

dayjs.extend(relativeTime);

interface Props {
  post: Post;
  onEdit: (id: string, title?: string, content?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function PostItem({ post, onEdit, onDelete }: Props) {
  const [upvotes, setUpvotes] = useState(0);

  const handleEdit = async () => {
    const newTitle = prompt("New title:", post.title);
    const newContent = prompt("New content:", post.content);
    if (newTitle === null && newContent === null) return;
    await onEdit(post._id, newTitle || undefined, newContent || undefined);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure?")) return;
    await onDelete(post._id);
  };

  const handleUpvote = () => {
    setUpvotes((prev) => prev + 1);
  };

  return (
    <li className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:scale-[1.01] transition-transform duration-300">
      {/* 🧍 Author + time */}
      <div className="flex items-center mb-3">
        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 mr-3">
          {post.author?.[0]?.toUpperCase() || "👤"}
        </div>
        <div>
          <p className="font-semibold text-gray-800 leading-tight">
            {post.author || "Anonymous"}
          </p>
          <p className="text-xs text-gray-500">
            {post.createdAt
              ? dayjs(post.createdAt).fromNow()
              : "Just now"}
          </p>
        </div>
      </div>

      {/* 📝 Post content */}
      <div className="flex justify-between items-start mb-2">
        <h2 className="font-semibold text-lg text-gray-800 break-words">
          {post.title || "Untitled"}
        </h2>
        <div className="space-x-2 shrink-0">
          <button
            onClick={handleEdit}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            ✏️ Edit
          </button>
          <button
            onClick={handleDelete}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            🗑 Delete
          </button>
        </div>
      </div>

      {post.content && (
        <div className="prose max-w-none text-gray-700 leading-relaxed mt-2">
          <MathRenderer html={post.content} />
        </div>
      )}

      {/* 🧭 Footer actions */}
      <div className="mt-4 flex items-center text-gray-500 text-sm space-x-6 border-t pt-3">
        <button
          onClick={handleUpvote}
          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
        >
          <ArrowBigUp size={18} /> <span>{upvotes}</span>
        </button>
        <button
          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
        >
          <MessageCircle size={18} /><span>Comment</span>
        </button>
        <button
          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
        >
          <Share2 size={18} /><span>Share</span>
        </button>
        {/* Future: bookmark, options, etc. */}
      </div>
    </li>
  );
}
