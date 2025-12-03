"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, notFound } from "next/navigation";
import FullPostClient from "@/components/posts/FullPostClient";
import CommentClientSection from "@/components/comments/CommentClientSection";
import FullScreenLoader from "@/components/common/FullScreenLoader";
import { useTranslation } from "react-i18next";
import type { Post } from "@/types/post";

export default function PostPage() {
  const { t } = useTranslation();
  const { id } = useParams() as { id: string };

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const mainRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!id) return;

    async function fetchData() {
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
    }

    fetchData();
  }, [id]);

  if (loading) return <FullScreenLoader text={t("loadingUser")} />;
  if (!post) return notFound();

  return (
    <div className="fixed inset-0 overflow-hidden bg-white dark:bg-black">
      <div className="w-full h-screen overflow-hidden">

        {/* LEFT SIDEBAR */}
        <aside
          className="
            hidden xl:flex flex-col
            fixed top-[4.3rem] left-0
            w-[320px] h-[calc(100vh-4.3rem)]
            bg-black text-white px-4 py-4
            border-r border-neutral-800
            overflow-y-auto
            z-30
          "
        >
          <p className="opacity-60 text-sm">Post Options</p>
        </aside>

        {/* RIGHT SIDEBAR */}
        <aside
          className="
            hidden xl:flex flex-col
            fixed top-[4.3rem] right-0
            w-[320px] h-[calc(100vh-4.3rem)]
            bg-black text-white px-4 py-4
            border-l border-neutral-800
            overflow-y-auto
            z-30
          "
        >
          <p>Related</p>
        </aside>

        {/* MAIN CONTENT */}
        <main
          ref={mainRef}
          className="
            absolute 
            top-[4.3rem]
            left-0 right-0
            xl:left-[320px] xl:right-[320px]
            h-[calc(100vh-4.3rem)]
            overflow-y-auto
            no-scrollbar
            px-3 md:px-6
            pb-[calc(env(safe-area-inset-bottom,0px)+72px)]
          "
        >
          <div className="max-w-2xl mx-auto py-6 space-y-10">
            
            {/* FULL POST */}
            <FullPostClient initialPost={post} />

            {/* COMMENTS */}
            <CommentClientSection comments={comments} postId={post._id} />

          </div>
        </main>

      </div>
    </div>
  );
}
