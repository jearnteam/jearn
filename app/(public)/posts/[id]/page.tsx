"use client";

import { useParams, notFound, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import PostOverlayShell from "@/app/(public)/posts/[id]/PostOverlayShell";
import FullPostClient from "@/components/posts/FullPostClient";
import CommentClientSection from "@/components/comments/CommentClientSection";
import FullScreenLoader from "@/components/common/FullScreenLoader";
import type { Post } from "@/types/post";

export default function PublicPostPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { status } = useSession();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  /* -------------------------------------------------
   * 🔁 AUTH UPGRADE (KEY FIX)
   * ------------------------------------------------- */
  useEffect(() => {
    if (status === "authenticated" && id) {
      // Logged-in user → upgrade to app overlay route
      router.replace(`/posts/${id}`);
    }
  }, [status, id, router]);

  /* -------------------------------------------------
   * FETCH PUBLIC DATA
   * ------------------------------------------------- */
  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        const postRes = await fetch(`/api/posts/${id}`, {
          cache: "no-store",
        });

        if (!postRes.ok) {
          setPost(null);
          return;
        }

        const postData = await postRes.json();
        setPost(postData);

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

  /* -------------------------------------------------
   * RENDER GUARDS
   * ------------------------------------------------- */
  if (status === "loading") return null; // prevent flicker
  if (status === "authenticated") return null; // redirect in progress

  if (loading) return <FullScreenLoader />;
  if (!post) return notFound();

  /* -------------------------------------------------
   * PUBLIC OVERLAY
   * ------------------------------------------------- */
  return (
    <PostOverlayShell onClose={() => router.push("/")}>
      {(scrollRef) => (
        <>
          <FullPostClient initialPost={post} />

          <CommentClientSection
            comments={comments}
            postId={post._id}
            scrollContainerRef={scrollRef}
          />
        </>
      )}
    </PostOverlayShell>
  );
}
