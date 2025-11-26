"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import FullPostClient from "@/components/posts/FullPostClient";
import CommentClientSection from "@/components/comments/CommentClientSection";
import LoadingOwl from "@/components/LoadingOwl";
import type { Post } from "@/types/post";
import { useTranslation } from "react-i18next";

export default function PostPage() {
  const {t} = useTranslation();
  
  const { id } = useParams() as { id: string };

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function fetchData() {
      try {
        const postRes = await fetch(`/api/posts/${id}`, {
          cache: "no-store",
        });
        if (!postRes.ok) return notFound();
        const postData = await postRes.json();
        setPost(postData);

        const commentsRes = await fetch(`/api/posts/${id}/comments`, {
          cache: "no-store",
        });
        if (commentsRes.ok) {
          const commentsData = await commentsRes.json();
          setComments(commentsData);
        }
      } catch (error) {
        console.error("Failed to load post or comments:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-neutral-900 z-50">
        <div className="flex flex-col items-center text-gray-600 dark:text-gray-300">
          <div className="w-48 h-48 flex items-center justify-center">
            <LoadingOwl />
          </div>
          <p className="text-lg font-medium mt-4">{t("loadingPosts") || "Loading post"}...</p>
        </div>
      </div>
    );
  }

  if (!post) return notFound();

  return (
    <div className="pt-[72px] md:pt-[88px] bg-white dark:bg-neutral-900">
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-10">
        <FullPostClient initialPost={post} />
        <CommentClientSection comments={comments} postId={post._id} />
      </main>
    </div>
  );
}
