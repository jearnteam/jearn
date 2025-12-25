"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import Image from "next/image";

import PostList from "@/components/posts/PostList";
import EditPostModal from "@/components/posts/EditPostModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import type { Post } from "@/types/post";
import FullScreenLoader from "@/components/common/FullScreenLoader";
import { normalizePosts } from "@/lib/normalizePosts";

interface Props {
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

/* ---------------------------------------------
 * Avatar URL helper (cache-safe)
 * ------------------------------------------- */
function avatarUrl(userId: string, updatedAt?: string | Date | null) {
  if (!updatedAt) {
    return "https://cdn.jearn.site/avatars/default.webp";
  }

  const ts =
    typeof updatedAt === "string"
      ? new Date(updatedAt).getTime()
      : updatedAt.getTime();

  return `https://cdn.jearn.site/avatars/${userId}.webp?v=${ts}`;
}

export default function ProfilePage({ scrollContainerRef }: Props) {
  const { t } = useTranslation();
  const mainRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const scrollRef = scrollContainerRef;

  const { user, loading, update } = useCurrentUser();
  const { status } = useSession();

  /* -------------------------
        Profile state
  -------------------------- */
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [bio, setBio] = useState("");

  const [preview, setPreview] = useState<string>(
    "https://cdn.jearn.site/avatars/default.webp"
  );
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  /* -------------------------
        Posts state
  -------------------------- */
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  const [editingPost, setEditingPost] = useState<Post | null>(null);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const sessionLoading = loading || status === "loading";

  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  /* -------------------------
      Redirect if not logged in
  -------------------------- */
  useEffect(() => {
    if (!sessionLoading && status === "unauthenticated") {
      router.push("/");
    }
  }, [sessionLoading, status, router]);

  /* -------------------------
      Load user profile data
  -------------------------- */
  useEffect(() => {
    if (!loading && user) {
      setName(user.name || "");
      setUserId(user.userId || "");
      setBio(user.bio || "");

      // ✅ cache-safe avatar URL
      setPreview(avatarUrl(user._id, user.avatarUpdatedAt));
    }
  }, [user, loading]);

  /* -------------------------
      Load user's posts
  -------------------------- */
  const loadPosts = useCallback(async () => {
    if (!user?._id) return;

    setPostsLoading(true);

    try {
      const res = await fetch(`/api/posts/byUser/${user._id}?limit=10`, {
        cache: "no-store",
      });
      const data = await res.json();

      setPosts(
        normalizePosts(data.posts ?? []).map((p: Post) => ({
          ...p,
          isAdmin: p.isAdmin === true,
        }))
      );

      setCursor(data.nextCursor ?? null);
      setHasMore(!!data.nextCursor);
    } finally {
      setPostsLoading(false);
    }
  }, [user?._id]);

  async function loadMore() {
    if (!hasMore || loadingMore || !cursor || !user?._id) return;

    setLoadingMore(true);

    try {
      const res = await fetch(
        `/api/posts/byUser/${user._id}?limit=10&cursor=${cursor}`,
        { cache: "no-store" }
      );
      const data = await res.json();

      setPosts((prev) => [...prev, ...normalizePosts(data.posts ?? [])]);

      setCursor(data.nextCursor ?? null);
      setHasMore(!!data.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  /* -------------------------
      Local avatar preview (file only)
  -------------------------- */
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  /* -------------------------
      Save profile data
  -------------------------- */
  async function handleSave() {
    if (!user?._id) {
      alert("Invalid user session.");
      return;
    }

    setUploading(true);

    const fd = new FormData();
    fd.append("user_id", user._id);
    fd.append("name", name);
    fd.append("userId", userId);
    fd.append("bio", bio);
    if (file) fd.append("picture", file);

    try {
      const res = await fetch("/api/user/update", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Update failed");
      }

      // Refresh user from DB
      await update();

      // Force fresh avatar once after upload
      setPreview(avatarUrl(user._id, new Date()));

      setFile(null);
      alert("Profile updated!");
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Unknown error occurred");
      }
    } finally {
      setUploading(false);
    }
  }

  /* -------------------------
      Post Actions
  -------------------------- */
  function requestDelete(id: string) {
    setDeletePostId(id);
    setConfirmDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deletePostId) return;

    try {
      setIsDeleting(true);
      await fetch(`/api/posts/${deletePostId}`, { method: "DELETE" });
      await loadPosts();
    } finally {
      setIsDeleting(false);
      setConfirmDeleteOpen(false);
      setDeletePostId(null);
    }
  }

  async function upvotePost(postId: string, userId: string) {
    const res = await fetch(`/api/posts/${postId}/upvote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    const data = await res.json();
    return res.ok
      ? { ok: true, action: data.action }
      : { ok: false, error: data.error };
  }

  /* -------------------------
      Loading UI
  -------------------------- */
  if (sessionLoading || postsLoading) {
    return <FullScreenLoader text={t("loadingPosts")} />;
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        {t("notLoggedIn") || "Not logged in"}
      </div>
    );
  }

  /* -------------------------
      Page UI
  -------------------------- */
  return (
    <>
      {/* Edit Modal */}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSave={async (title, content, categories, tags) => {
            await fetch(`/api/posts/${editingPost._id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title, content, categories, tags }),
            });

            await loadPosts();
            setEditingPost(null);
          }}
        />
      )}

      {/* Delete Modal */}
      <DeleteConfirmModal
        open={confirmDeleteOpen}
        onCancel={() => {
          if (!isDeleting) {
            setConfirmDeleteOpen(false);
            setDeletePostId(null);
          }
        }}
        onConfirm={confirmDelete}
      />

      <div className="fixed inset-0 overflow-hidden bg-white dark:bg-black">
        <main
          className="
            absolute top-[4.3rem]
            left-0 right-0
            h-[calc(100vh-4.3rem)]
            overflow-y-auto no-scrollbar
            pb-[calc(env(safe-area-inset-bottom,0px)+72px)]
          "
        >
          <div className="feed-container mt-10">
            {/* PROFILE SETTINGS */}
            <h1 className="text-2xl font-bold mb-6">
              {t("profileSettings") || "Profile Settings"}
            </h1>

            <div className="flex flex-col gap-4">
              {/* Avatar Upload */}
              <div className="flex items-center gap-6">
                <div
                  className="relative group cursor-pointer"
                  onClick={() =>
                    document.getElementById("avatarInput")?.click()
                  }
                >
                  <div
                    className="
                      w-24 h-24 rounded-full overflow-hidden
                      border border-gray-300 dark:border-gray-600
                      group-hover:opacity-80 transition
                    "
                  >
                    <Image
                      src={preview}
                      alt="avatar preview"
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>

                  <div
                    className="
                      absolute inset-0 rounded-full
                      bg-black/40 text-white
                      opacity-0 group-hover:opacity-100
                      flex items-center justify-center
                      text-sm font-medium transition
                    "
                  >
                    Change
                  </div>
                </div>
                {/* Text */}{" "}
                <div
                  className="cursor-pointer select-none"
                  onClick={() =>
                    document.getElementById("avatarInput")?.click()
                  }
                >
                  {" "}
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                    {" "}
                    Change profile picture{" "}
                  </p>{" "}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {" "}
                    using JPG, PNG is Recommended{" "}
                  </p>{" "}
                </div>
                <input
                  id="avatarInput"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <label>{t("name") || "Name"}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border rounded px-2 py-1"
              />

              <label>User ID</label>
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="border rounded px-2 py-1"
              />

              <label>{t("bio") || "Bio"}</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="border rounded px-2 py-1"
              />

              <button
                onClick={handleSave}
                disabled={uploading}
                className="px-4 py-2 rounded bg-blue-600 text-white"
              >
                {uploading ? "Saving..." : t("saveChanges") || "Save Changes"}
              </button>
            </div>

            {/* POSTS */}
            <div className="mt-16">
              <h2 className="text-xl font-semibold mb-4">
                {t("yourPosts") || "Your Posts"}
              </h2>

              <PostList
                posts={posts}
                hasMore={hasMore}
                onLoadMore={loadMore}
                onEdit={(p) => setEditingPost(p)}
                onDelete={(id) => Promise.resolve(requestDelete(id))}
                onUpvote={upvotePost}
                onAnswer={() => {}}
                scrollContainerRef={scrollRef}
              />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
