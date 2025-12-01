"use client";

import { use, useState, useEffect, useRef } from "react";
import PostList from "@/components/posts/PostList";
import Avatar from "@/components/Avatar";
import type { Post } from "@/types/post";
import { useTranslation } from "react-i18next";

export default function UserPage({ params }: any) {
  const { t } = useTranslation();
  const { id } = use(params) as { id: string };

  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const mainRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function load() {
      try {
        /* -------------------------- USER INFO -------------------------- */
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

        /* -------------------------- USER POSTS ------------------------- */
        const pRes = await fetch(`/api/posts/byUser/${id}`, {
          cache: "no-store",
        });
        const pData = await pRes.json();

        // ⭐ IMPORTANT: force-forward isAdmin so admin glow works in PostItem
        const cleanedPosts = (pData.posts || []).map((p: any) => ({
          ...p,
          isAdmin: p.isAdmin === true,
        }));

        setPosts(cleanedPosts);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  /* ----------------------- LOADING STATES ----------------------- */
  if (loading)
    return (
      <div className="fixed inset-0 flex justify-center items-center">
        {t("loading") || "Loading"}...
      </div>
    );

  if (!user)
    return (
      <div className="fixed inset-0 flex justify-center items-center">
        {t("userNotFound") || "User not found."}
      </div>
    );

  /* ----------------------- PAGE LAYOUT ----------------------- */
  return (
    <div className="fixed inset-0 overflow-hidden bg-white dark:bg-black">
      <div className="w-full h-screen overflow-hidden bg-white dark:bg-black">
        
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
          <p className="opacity-70">Profile Menu</p>
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

        {/* MAIN CONTENT SCROLL */}
        <main
          ref={mainRef}
          className="
            absolute
            top-[4.3rem]
            left-0 right-0
            xl:left-[320px] xl:right-[320px]
            h-[calc(100vh-4.3rem)]
            overflow-y-auto
            px-3 md:px-6
            pb-[calc(env(safe-area-inset-bottom,0px)+72px)]
          "
        >
          <div className="max-w-2xl mx-auto py-6 space-y-10">
            
            {/* HEADER */}
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-300 dark:border-gray-700">
              <Avatar id={id} size={80} className="border" />

              <div>
                <h1 className="text-2xl font-bold">{user.name}</h1>
                <h2 className="text-gray-600 dark:text-gray-400">
                  {user.userId ? "@" + user.userId : ""}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">{user.bio}</p>
              </div>
            </div>

            {/* POSTS TITLE */}
            <h2 className="text-xl font-semibold">
              {t("postsByBefore") ?? "Posts by"} {user.name}{" "}
              {t("postsByAfter") ?? ""}
            </h2>

            {/* POSTS LIST */}
            <PostList
              posts={posts}
              onEdit={() => {}}
              onDelete={async () => {}}
              onUpvote={async () => ({ ok: false })}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
