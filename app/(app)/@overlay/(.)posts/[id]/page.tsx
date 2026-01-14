"use client";

import { useParams, notFound } from "next/navigation";
import { useEffect, useState } from "react";
import PostOverlayShell from "@/app/(app)/posts/[id]/PostOverlayShell";
import FullPostClient from "@/components/posts/FullPostClient";
import CommentClientSection from "@/components/comments/CommentClientSection";
import FullScreenLoader from "@/components/common/FullScreenLoader";
import { PostTypes, type Post } from "@/types/post";

export default function OverlayPostPage() {
  const { id } = useParams() as { id: string };

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    (async () => {
      try {
        const postRes = await fetch(`/api/posts/${id}`, {
          cache: "no-store",
        });

        if (!postRes.ok) {
          if (!cancelled) setPost(null);
          return;
        }

        const postData = await postRes.json();
        if (!cancelled) setPost(postData);

        const commentsRes = await fetch(`/api/posts/${id}/comments`, {
          cache: "no-store",
        });
        if (commentsRes.ok && !cancelled) {
          setComments(await commentsRes.json());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  /* -------------------------------
     1️⃣ LOADING
  -------------------------------- */
  if (loading) {
    return <FullScreenLoader text="Loading post…" />;
  }

  /* -------------------------------
     2️⃣ NOT FOUND (AFTER loading)
  -------------------------------- */
  if (!post) {
    return notFound();
  }

  /* -------------------------------
     3️⃣ CONTENT
  -------------------------------- */
  return (
    <PostOverlayShell onClose={() => history.back()}>
      {() => (
        <>
          <FullPostClient initialPost={post} />
          {post.postType !== PostTypes.QUESTION ? (
            <CommentClientSection comments={comments} postId={post._id} />
          ) : (
            <></>
          )}
        </>
      )}
    </PostOverlayShell>
  );
}
