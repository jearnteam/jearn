"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SearchItem, SearchMode } from "@/types/search";
import SearchTabs from "./SearchTabs";
import Link from "next/link";
import PostList from "@/components/posts/PostList";
import type { Post } from "@/types/post";
import { User, FolderGit2, Pencil } from "lucide-react";

import EditPostModal from "@/components/posts/EditPostModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import AnswerModal from "@/components/posts/AnswerModal";

import { useEditPostModal } from "@/features/posts/hooks/useEditPostModal";
import { useDeletePostModal } from "@/features/posts/hooks/useDeletePostModal";
import { usePostInteractions } from "@/features/posts/hooks/usePostInteractions";
import { usePosts } from "@/features/posts/hooks/usePosts";
import { useSearchSSEPosts } from "@/hooks/search/useSearchSSEPosts";

type Props = {
  query: string;
  mode: SearchMode;
  results: SearchItem[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onChangeMode: (m: SearchMode) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
};

export default function SearchPageClient({
  query,
  mode,
  results,
  hasMore,
  loadingMore,
  onLoadMore,
  onChangeMode,
  scrollContainerRef,
}: Props) {
  const localScrollRef = useRef<HTMLDivElement | null>(null);
  const activeScrollRef = scrollContainerRef ?? localScrollRef;
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  /* ---------------- SPLIT RESULTS ---------------- */

  const safeResults = Array.isArray(results) ? results : [];

  const users = safeResults.filter((r) => r.type === "user").map((r) => r.data);

  const categories = safeResults
    .filter((r) => r.type === "category")
    .map((r) => r.data);

  const initialPosts = useMemo(() => {
    return safeResults
      .filter((r) => r.type === "post")
      .map((r) => r.data as Post);
  }, [safeResults]);

  // 🔥 SSE patching
  const posts = useSearchSSEPosts(initialPosts);

  /* ---------------- POST INTERACTIONS ---------------- */

  const { editingPost, openEdit, closeEdit } = useEditPostModal();
  const { deleteId, requestDelete, closeDelete } = useDeletePostModal();
  const [answeringPost, setAnsweringPost] = useState<Post | null>(null);

  const { addAnswer, editPost, deletePost } = usePosts();
  const { upvote, vote, answer } = usePostInteractions({
    setAnsweringPost,
  });

  /* ---------------- INFINITE SCROLL ---------------- */

  useEffect(() => {
    if (!hasMore || loadingMore || mode === "users") return;

    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && onLoadMore(),
      { root: activeScrollRef.current, threshold: 0.6 }
    );

    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, mode, onLoadMore]);

  /* ---------------- RENDER ---------------- */

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black">
      <div className="z-30 bg-white dark:bg-black border-b">
        <SearchTabs mode={mode} onChange={onChangeMode} />
      </div>

      <main
        ref={activeScrollRef}
        className="flex-1 overflow-y-auto no-scrollbar"
      >
        <div className="feed-container py-4 space-y-10">
          {/* USERS */}
          {(mode === "all" || mode === "users") && users.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-500 flex items-center gap-2">
                <User size={16} /> Users
              </h2>
              <div className="grid gap-2">
                {users.map((u: any) => (
                  <UserCard key={u._id} user={u} />
                ))}
              </div>
            </section>
          )}

          {/* CATEGORIES */}
          {mode === "all" && (
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
                  {categories.map((c: any) => (
                    <Link
                      key={c.id}
                      href={`/categories/${c.id}`}
                      className="block p-4 border rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-900"
                    >
                      <div className="font-medium">{c.name}</div>
                      {(c.jname || c.myname) && (
                        <div className="text-xs text-gray-400">
                          {c.jname || c.myname}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* POSTS */}
          {mode !== "users" && (
            <section>
              {posts.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">
                  No results
                </div>
              ) : (
                <>
                  <h2 className="mb-3 text-sm font-semibold text-gray-500 flex items-center gap-2">
                    <Pencil size={16} /> Posts
                  </h2>
                  <PostList
                    posts={posts}
                    hasMore={hasMore}
                    onLoadMore={onLoadMore}
                    onUpvote={upvote}
                    onVote={vote}
                    onAnswer={answer}
                    capabilities={{
                      edit: openEdit,
                      delete: requestDelete,
                    }}
                    scrollContainerRef={activeScrollRef}
                  />
                </>
              )}
            </section>
          )}

          {/* LOAD MORE TRIGGER */}
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

      {/* EDIT */}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={closeEdit}
          onSave={async (
            title,
            content,
            categories,
            tags,
            poll,
            commentDisabled
          ) => {
            await editPost(
              editingPost._id,
              editingPost.content ?? "",
              title,
              content,
              categories,
              tags,
              editingPost.references,
              poll,
              commentDisabled
            );
            closeEdit();
          }}
        />
      )}

      {/* ANSWER */}
      {answeringPost && (
        <AnswerModal
          questionPost={answeringPost}
          onClose={() => setAnsweringPost(null)}
          onSubmit={addAnswer}
        />
      )}

      {/* DELETE */}
      <DeleteConfirmModal
        open={!!deleteId}
        onCancel={closeDelete}
        onConfirm={async () => {
          if (!deleteId) return;
          await deletePost(deleteId);
          closeDelete();
        }}
      />
    </div>
  );
}

/* ================= USER CARD ================= */

function UserCard({ user }: { user: any }) {
  return (
    <Link
      href={`/profile/${user._id}`}
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
