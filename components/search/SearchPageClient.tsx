"use client";

import { useEffect, useRef, useMemo } from "react";
import { SearchItem, SearchMode } from "@/types/search";
import SearchTabs from "./SearchTabs";
import Link from "next/link";
import PostList from "@/components/posts/PostList";
import type { Post } from "@/types/post";
import { User, FolderGit2, Pencil } from "lucide-react";

type Props = {
  query: string;
  mode: SearchMode;
  results?: SearchItem[];
  onChangeMode: (m: SearchMode) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  hasMore: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
};

export default function SearchPageClient({
  query,
  mode,
  results = [],
  onChangeMode,
  scrollContainerRef,
  hasMore,
  onLoadMore,
  loadingMore,
}: Props) {
  const localScrollRef = useRef<HTMLDivElement | null>(null);
  const activeScrollRef = scrollContainerRef ?? localScrollRef;
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const safeResults = Array.isArray(results) ? results : [];

  const users = safeResults.filter((r) => r.type === "user");
  const categories = safeResults.filter((r) => r.type === "category");

  const allPosts: Post[] = safeResults
    .filter((r) => r.type === "post")
    .map((r) => r.data as Post);

  // API already returns correct post type
  const visiblePosts: Post[] = allPosts;

  /* ---------------- INFINITE SCROLL ---------------- */

  useEffect(() => {
    if (!hasMore || loadingMore || mode === "users") return;

    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && onLoadMore(),
      { root: activeScrollRef.current, threshold: 0.6 }
    );

    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore, mode]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black">
      {/* HEADER */}
      <div className="z-30 bg-white dark:bg-black border-b">
        <SearchTabs mode={mode} onChange={onChangeMode} />
      </div>

      {/* SCROLL */}
      <main
        ref={activeScrollRef}
        className="flex-1 overflow-y-auto no-scrollbar"
      >
        <div className="feed-container py-4 space-y-10">
          {/* ================= ALL ================= */}
          {mode === "all" && (
            <>
              {/* USERS */}
              {users.length > 0 && (
                <section>
                  <h2 className="mb-3 text-sm font-semibold text-gray-500 flex items-center gap-2">
                    <User size={16} /> Users
                  </h2>
                  <div className="grid gap-2">
                    {users.map((u) => (
                      <UserCard key={u.data._id} user={u.data} />
                    ))}
                  </div>
                </section>
              )}

              {/* CATEGORIES */}
              <section>
                <h2 className="mb-3 text-sm font-semibold text-gray-500 flex items-center gap-2">
                  <FolderGit2 size={16} /> Categories
                </h2>
                {categories.length === 0 ? (
                  <div className="text-sm text-gray-400">
                    No matching categories
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {categories.map((c) => (
                      <Link
                        key={c.data.id}
                        href={`/categories/${c.data.id}`}
                        className="block p-4 border rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-900"
                      >
                        <div className="font-medium">{c.data.name}</div>
                        {(c.data.jname || c.data.myname) && (
                          <div className="text-xs text-gray-400">
                            {c.data.jname || c.data.myname}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {/* POSTS */}
              {allPosts.length > 0 && (
                <section>
                  <h2 className="mb-3 text-sm font-semibold text-gray-500 flex items-center gap-2">
                    <Pencil size={16} /> Posts
                  </h2>
                  <PostList
                    posts={allPosts}
                    hasMore={false}
                    onLoadMore={() => {}}
                    onEdit={() => {}}
                    onDelete={async () => {}}
                    onUpvote={async () => {}}
                    onAnswer={() => {}}
                    scrollContainerRef={activeScrollRef}
                  />
                </section>
              )}
            </>
          )}

          {/* ================= POST TYPES ================= */}
          {mode !== "all" && mode !== "users" && (
            <>
              {visiblePosts.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">
                  No results
                </div>
              ) : (
                <PostList
                  posts={visiblePosts}
                  hasMore={hasMore}
                  onLoadMore={onLoadMore}
                  onEdit={() => {}}
                  onDelete={async () => {}}
                  onUpvote={async () => {}}
                  onAnswer={() => {}}
                  scrollContainerRef={activeScrollRef}
                />
              )}
            </>
          )}

          {/* ================= USERS ================= */}
          {mode === "users" && (
            <section className="space-y-2">
              {users.map((u) => (
                <UserCard key={u.data._id} user={u.data} />
              ))}
            </section>
          )}

          {/* LOAD MORE */}
          {hasMore && mode !== "users" && (
            <div
              ref={loadMoreRef}
              className="h-12 flex items-center justify-center text-sm text-gray-400"
            >
              {loadingMore ? "Loading more…" : "Scroll for more"}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* ================= USER CARD ================= */

function UserCard({ user }: { user: any }) {
  return (
    <Link
      href={`/users/${user._id}`}
      className="block p-4 border rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-900"
    >
      <div className="flex items-center gap-3">
        <img
          src={user.picture}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div>
          <div className="font-medium">{user.name}</div>
          {user.uniqueId && (
            <div className="text-xs text-gray-400">@{user.uniqueId}</div>
          )}
        </div>
      </div>
    </Link>
  );
}
