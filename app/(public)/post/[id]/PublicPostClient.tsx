"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import PostOverlayShell from "@/app/(public)/post/[id]/PostOverlayShell";
import FullPostClient from "@/components/posts/FullPostClient";
import FullScreenLoader from "@/components/common/FullScreenLoader";
import { PostTypes, type Post } from "@/types/post";

export default function PublicPostClient({ id }: { id: string }) {
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        // 1️⃣ Fetch Post
        const postRes = await fetch(`/api/posts/${id}`, {
          cache: "no-store",
        });

        if (!postRes.ok) {
          setPost(null);
          return;
        }

        const postData: Post = await postRes.json();
        setPost(postData);

        // 2️⃣ Fetch comments if not Question
        if (postData.postType !== PostTypes.QUESTION) {
          const commentsRes = await fetch(
            `/api/posts/${id}/comments`,
            { cache: "no-store" }
          );

          if (commentsRes.ok) {
            const data = await commentsRes.json();
            setComments(Array.isArray(data) ? data : []);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // 🛑 Guards
  if (loading) return <FullScreenLoader />;
  if (!post) return null;

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
