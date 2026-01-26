"use client";

import { useParams, notFound, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import PostOverlayShell from "@/app/(public)/posts/[id]/PostOverlayShell";
import FullPostClient from "@/components/posts/FullPostClient";
import FullScreenLoader from "@/components/common/FullScreenLoader";
import { PostTypes, type Post } from "@/types/post";

export default function PublicPostPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { status } = useSession();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  /* -------------------------------------------------
   * 🔁 AUTH UPGRADE
   * ------------------------------------------------- */
  useEffect(() => {
    if (status === "authenticated" && id) {
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
        // 1. Fetch Post
        const postRes = await fetch(`/api/posts/${id}`, {
          cache: "no-store",
        });

        if (!postRes.ok) {
          setPost(null);
          return;
        }

        const postData: Post = await postRes.json();
        setPost(postData);

        // 2. Fetch Comments ONLY if NOT a Question
        if (postData.postType !== PostTypes.QUESTION) {
          const commentsRes = await fetch(`/api/posts/${id}/comments`, {
            cache: "no-store",
          });

          if (commentsRes.ok) {
            const data = await commentsRes.json();
            // ✅ 配列チェックを追加 (万が一 {error: ...} が返ってきた場合などを考慮)
            if (Array.isArray(data)) {
              setComments(data);
            } else {
              setComments([]);
            }
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  /* -------------------------------------------------
   * RENDER GUARDS
   * ------------------------------------------------- */
  if (status === "loading") return null;
  if (status === "authenticated") return null;

  if (loading) return <FullScreenLoader />;
  if (!post) return notFound();

  /* -------------------------------------------------
   * PUBLIC OVERLAY
   * ------------------------------------------------- */
  return (
    <PostOverlayShell onClose={() => router.push("/")}>
      {(scrollRef) => (
        <FullPostClient
          initialPost={post}
          initialComments={comments}
          scrollContainerRef={scrollRef}
        />
      )}
    </PostOverlayShell>
  );
}
