"use client";

import { use, useState, useEffect } from "react";
import PostList from "@/components/posts/PostList";
import Avatar from "@/components/Avatar";
import type { Post } from "@/types/post";

export default function UserPage({ params }: any) {
  const { id } = use(params) as { id: string };

  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const uRes = await fetch(`/api/user/${id}`, { cache: "no-store" });
        const uData = await uRes.json();

        if (!uData.ok) {
          setUser(null);
          setLoading(false);
          return;
        }

        setUser({
          ...uData.user,
          picture: `/api/user/avatar/${id}?v=${Date.now()}`,
        });

        const pRes = await fetch(`/api/posts/byUser/${id}`, {
          cache: "no-store",
        });
        const pData = await pRes.json();
        setPosts(pData.posts || []);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-[70vh]">Loading...</div>
    );

  if (!user) return <div className="p-4">User not found.</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 mt-20">

      {/* --- User Header --- */}
      <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-300 dark:border-gray-700">
        <Avatar id={id} size={80} className="border" />

        <div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="text-gray-600 dark:text-gray-400">{user.bio}</p>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-3">Posts by {user.name}</h2>

      {/* ⭐ No scroll div — full body scroll */}
      <PostList
        posts={posts}
        onEdit={() => {}}
        onDelete={async () => {}}
        onUpvote={async () => ({ ok: false })}
      />
    </div>
  );
}
