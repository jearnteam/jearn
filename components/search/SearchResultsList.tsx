"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { SearchItem } from "@/types/search";
import type { Post } from "@/types/post";
import Image from "next/image";
import { FolderGit2, Pencil, Video, BadgeQuestionMark, MessageSquareDiff  } from "lucide-react";

/* =========================================================
 * Type helpers
 * ======================================================= */

type UserItem = Extract<SearchItem, { type: "user" }>;
type CategoryItem = Extract<SearchItem, { type: "category" }>;
type PostItemType = Extract<SearchItem, { type: "post" }>;

type Grouped = {
  users: UserItem[];
  categories: CategoryItem[];
  posts: PostItemType[];
};

/* ----------------- Type guards ----------------- */

function isUser(item: SearchItem): item is UserItem {
  return item.type === "user";
}

function isCategory(item: SearchItem): item is CategoryItem {
  return item.type === "category";
}

function isPost(item: SearchItem): item is PostItemType {
  return item.type === "post";
}

/* =========================================================
 * Component
 * ======================================================= */

export default function SearchResultsList({
  results,
}: {
  results: SearchItem[];
}) {
  const grouped = useMemo<Grouped>(() => {
    return {
      users: results.filter(isUser),
      categories: results.filter(isCategory),
      posts: results.filter(isPost),
    };
  }, [results]);

  return (
    <div>
      {/* ================= USERS ================= */}
      {grouped.users.length > 0 && (
        <Section label="Users">
          <ul className="mb-2">
            {grouped.users.map((item) => {
              const user = item.data;

              return (
                <li key={`user-${user._id}`}>
                  <Link
                    href={`/users/${user.uniqueId}`}
                    className="
                      flex items-center gap-3
                      px-4 py-1
                      border-b hover:bg-gray-50 dark:hover:bg-neutral-900
                    "
                  >
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-medium">{user.name}</div>
                      {user.uniqueId && (
                        <div className="text-xs text-gray-500">
                          @{user.uniqueId}
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* ================= CATEGORIES ================= */}
      {grouped.categories.length > 0 && (
        <Section label="Categories">
          <ul className="mb-2">
            {grouped.categories.map((item) => {
              const cat = item.data;

              return (
                <li key={`cat-${cat.id}`}>
                  <Link
                    href={`/category/${cat.name}`}
                    className="
                      block px-4 py-1
                      border-b hover:bg-gray-50 dark:hover:bg-neutral-900
                    "
                  >
                    <div className="font-medium">
                      <FolderGit2 size={16}/> {cat.name || cat.jname || cat.myname}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* ================= POSTS ================= */}
      {grouped.posts.length > 0 && (
        <Section label="Posts">
          <ul>
            {grouped.posts.map((item) => (
              <PostRow key={`post-${item.data._id}`} post={item.data} />
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

/* =========================================================
 * Section header
 * ======================================================= */

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="px-4 mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
        {label}
      </div>
      {children}
    </div>
  );
}

/* =========================================================
 * Post row
 * ======================================================= */

function PostRow({ post }: { post: Post }) {
  const typeIcon =
    post.postType === "Question"
      ? <BadgeQuestionMark size={16}/>
      : post.postType === "Answer"
      ? <MessageSquareDiff size={16}/>
      : post.postType === "VIDEO"
      ? <Video size={16}/>
      : <Pencil size={16}/>;

  const tags = post.tags ?? [];

  return (
    <li>
      <Link
        href={`/posts/${post._id}`}
        className="
          block px-4 py-2
          border-b hover:bg-gray-50 dark:hover:bg-neutral-900
        "
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{typeIcon}</span>
          <span className="text-base font-medium line-clamp-1">
            {post.title || "(No title)"}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
          <span>{post.authorName}</span>

          {post.categories?.map((c) => (
            <span
              key={c.id}
              className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-800"
            >
              {c.name}
            </span>
          ))}

          {tags.length > 0 && (
            <span className="text-gray-400">
              #{tags.slice(0, 2).join(" #")}
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}
