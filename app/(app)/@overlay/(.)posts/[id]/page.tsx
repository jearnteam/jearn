"use client";

import { useParams, notFound } from "next/navigation";
import { useEffect, useState } from "react";
import FullPostClient from "@/components/posts/FullPostClient";
import CommentClientSection from "@/components/comments/CommentClientSection";
import FullScreenLoader from "@/components/common/FullScreenLoader";
import type { Post } from "@/types/post";

export default function OverlayPostPage() {
  const { id } = useParams() as { id: string };

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        const postRes = await fetch(`/api/posts/${id}`, { cache: "no-store" });
        if (!postRes.ok) return notFound();
        setPost(await postRes.json());

        const commentsRes = await fetch(`/api/posts/${id}/comments`, {
          cache: "no-store",
        });
        if (commentsRes.ok) setComments(await commentsRes.json());
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <FullScreenLoader />;
  if (!post) return notFound();

  return (
    /* 🔴 CRITICAL FIX */
    <div>
      {/* Backdrop click */}
      <div
        className="absolute inset-0"
        onClick={() => history.back()}
      />

      {/* Modal */}
      <div className="
        absolute inset-x-0 top-[4.3rem] bottom-0
        bg-white dark:bg-black
        overflow-y-auto
        no-scrollbar
      ">
        <div className="max-w-2xl mx-auto py-6 space-y-10 px-4">
          <FullPostClient initialPost={post} />
          <CommentClientSection
            comments={comments}
            postId={post._id}
          />
        </div>
      </div>
    </div>
  );
}
