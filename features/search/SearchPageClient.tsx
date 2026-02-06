"use client";

import { useRef, useState } from "react";
import { SearchItem, SearchMode } from "./types";
import SearchTabs from "./SearchTabs";
import PostList from "@/components/posts/PostList";
import type { Post } from "@/types/post";
import Link from "next/link";

export default function SearchPageClient({
  query,
  mode,
  results,
  onChangeMode,
  scrollContainerRef,
}: {
  query: string;
  mode: SearchMode;
  results: SearchItem[];
  onChangeMode: (m: SearchMode) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const localScrollRef = useRef<HTMLDivElement | null>(null);
  const activeScrollRef = scrollContainerRef ?? localScrollRef;

  /* ---------------------------------------------
   * SPLIT RESULTS
   * ------------------------------------------- */
  const postResults: Post[] = results
    .filter((r) => r.type === "post")
    .map((r) => r.data);

  const userResults = results.filter((r) => r.type === "user");
  const categoryResults = results.filter((r) => r.type === "category");

  /* ---------------------------------------------
   * REQUIRED PostList FUNCTIONS (HomePage-style)
   * ------------------------------------------- */
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [answeringPost, setAnsweringPost] = useState<Post | null>(null);

  async function onUpvote(_id: string) {
    // optional: reuse HomePage apiFetch later
  }

  function onDelete(_id: string) {
    // search overlay = readonly
  }

  function onEdit(_post: Post) {
    setEditingPost(_post);
  }

  function onAnswer(post: Post) {
    setAnsweringPost(post);
  }

  /* ---------------------------------------------
   * RENDER
   * ------------------------------------------- */
  return (
    <div className="fixed inset-0 bg-white dark:bg-black overflow-hidden">
      {/* 🔹 SEARCH TABS (sticky inside overlay) */}
      <SearchTabs mode={mode} onChange={onChangeMode} />
      <main
        ref={activeScrollRef}
        className="
    absolute
    top-[7rem]
    left-0 right-0
    h-[calc(100vh-7rem)]
    overflow-y-auto
    no-scrollbar
  "
      >
        <div className="feed-container py-6 space-y-8">
          {/* USERS */}
          {(mode === "all" || mode === "users") &&
            userResults.map((u) => (
              <Link
                key={u.data.uniqueId}
                href={`/users/${u.data.uniqueId}`}
                className="block p-4 border rounded-xl"
              >
                👤 {u.data.name}
              </Link>
            ))}

          {/* CATEGORIES */}
          {(mode === "all" || mode === "categories") &&
            categoryResults.map((c) => (
              <Link
                key={c.data.id}
                href={`/categories/${c.data.id}`}
                className="block p-4 border rounded-xl"
              >
                🏷️ {c.data.id}
              </Link>
            ))}

          {/* POSTS — ✅ SAME AS HOMEPAGE */}
          {(mode === "all" || mode === "posts") && (
            <PostList
              posts={postResults}
              hasMore={false}
              onLoadMore={() => {}}
              onEdit={onEdit}
              onDelete={async (id) => onDelete(id)}
              onUpvote={onUpvote}
              onAnswer={onAnswer}
              scrollContainerRef={activeScrollRef}
            />
          )}
        </div>
      </main>
    </div>
  );
}
