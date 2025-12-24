"use client";

import { useParams, notFound, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PostOverlayShell from "@/app/(app)/posts/[id]/PostOverlayShell";
import FullPostClient from "@/components/posts/FullPostClient";
import CommentClientSection from "@/components/comments/CommentClientSection";
import FullScreenLoader from "@/components/common/FullScreenLoader";
import type { Post } from "@/types/post";

export default function PostPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        const postRes = await fetch(`/api/posts/${id}`, {
          cache: "no-store",
        });

        if (!postRes.ok) return notFound();
        setPost(await postRes.json());

        const commentsRes = await fetch(`/api/posts/${id}/comments`, {
          cache: "no-store",
        });

        if (commentsRes.ok) {
          setComments(await commentsRes.json());
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <FullScreenLoader />;
  if (!post) return notFound();

  return (
    <PostOverlayShell onClose={() => router.push("/")}>
      {(scrollRef) => (
        <>
          <FullPostClient initialPost={post} />
          <CommentClientSection comments={comments} postId={post._id} />
        </>
      )}
    </PostOverlayShell>
  );
}
