//@/(app)/@overlay/(.)posts/[id]/page.tsx
"use client";

import { useParams, notFound } from "next/navigation";
import { useEffect, useState } from "react";
import PostOverlayShell from "@/app/(app)/posts/[id]/PostOverlayShell";
import FullPostClient from "@/components/posts/FullPostClient";
import FullScreenLoader from "@/components/common/FullScreenLoader";
import { PostTypes, type Post } from "@/types/post";
import { UploadProvider } from "@/components/upload/UploadContext";

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
        // 1. Fetch Post
        const postRes = await fetch(`/api/posts/${id}`, {
          cache: "no-store",
        });

        if (!postRes.ok) {
          if (!cancelled) setPost(null);
          return;
        }

        const postData: Post = await postRes.json();
        if (cancelled) return;
        
        setPost(postData);

        // 2. Fetch Comments ONLY if NOT a Question
        if (postData.postType !== PostTypes.QUESTION) {
          const commentsRes = await fetch(`/api/posts/${id}/comments`, {
            cache: "no-store",
          });
          if (commentsRes.ok && !cancelled) {
            const data = await commentsRes.json();
            // 配列チェック
            if (Array.isArray(data)) {
              setComments(data);
            } else {
              setComments([]);
            }
          }
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
      {(scrollRef) => (
        // ✅ FullPostClient に表示制御を集約
        <UploadProvider>
          <FullPostClient
            initialPost={post}
            initialComments={comments}
            scrollContainerRef={scrollRef}
          />
        </UploadProvider>
      )}
    </PostOverlayShell>
  );
}