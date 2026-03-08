"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { SearchItem } from "@/types/search";
import type { Post } from "@/types/post";
import Image from "next/image";
import {
  FolderGit2,
  Pencil,
  Video,
  BadgeQuestionMark,
  MessageSquareDiff,
  Clock,
} from "lucide-react";

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

type HistoryItem = {
  type: "history";
  data: {
    id: string;
    label: string;
  };
};

type ExtendedItem = SearchItem | HistoryItem;

export default function SearchResultsList({
  results,
  activeIndex,
  setActiveIndex,
  onSelectItem,
}: {
  results: ExtendedItem[];
  activeIndex: number;
  setActiveIndex: (n: number) => void;
  onSelectItem?: (item: ExtendedItem) => void;
}) {
  let runningIndex = -1;
  const getIndex = () => ++runningIndex;
  const grouped = useMemo(() => {
    const history = results.filter(
      (r): r is HistoryItem => r.type === "history"
    );

    const users = results.filter((r): r is UserItem => r.type === "user");

    const categories = results.filter(
      (r): r is CategoryItem => r.type === "category"
    );

    const posts = results.filter((r): r is PostItemType => r.type === "post");

    return { history, users, categories, posts };
  }, [results]);

  return (
    <div>
      {/* ================= HISTORY ================= */}
      {grouped.history.length > 0 && (
        <Section label="Recent">
          <ul className="mb-2">
            {grouped.history.map((item) => {
              const index = getIndex();
              const isActive = index === activeIndex;

              return (
                <li key={`history-${item.data.id}`}>
                  <button
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => onSelectItem?.(item)}
                    className={`
                flex items-center gap-3 px-4 py-2 w-full text-left border-b min-w-0
                ${
                  isActive
                    ? "bg-gray-100 dark:bg-neutral-800"
                    : "hover:bg-gray-50 dark:hover:bg-neutral-900"
                }
              `}
                  >
                    <Clock size={16} className="text-gray-400 shrink-0" />
                    <span className="flex-1 text-sm truncate">
                      {item.data.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>
      )}
      {/* ================= USERS ================= */}
      {grouped.users.length > 0 && (
        <Section label="Users">
          <ul className="mb-2">
            {grouped.users.map((item) => {
              const user = item.data;
              const index = getIndex();
              const isActive = index === activeIndex;

              return (
                <li key={`user-${user._id}`}>
                  <Link
                    href={`/profile/${user._id}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => onSelectItem?.(item)}
                    className={`
          flex items-center gap-3 px-4 py-2 w-full text-left border-b min-w-0
          ${
            isActive
              ? "bg-gray-100 dark:bg-neutral-800"
              : "hover:bg-gray-50 dark:hover:bg-neutral-900"
          }
        `}
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
              const index = getIndex();
              const isActive = index === activeIndex;

              return (
                <li key={`cat-${cat.id}`}>
                  <Link
                    href={`/category/${cat.name}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => onSelectItem?.(item)}
                    className={`
          block px-4 py-2 border-b
          ${
            isActive
              ? "bg-gray-100 dark:bg-neutral-800"
              : "hover:bg-gray-50 dark:hover:bg-neutral-900"
          }
        `}
                  >
                    <FolderGit2 size={16} className="inline mr-2" />
                    {cat.name || cat.jname || cat.myname}
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
            {grouped.posts.map((item) => {
              const index = getIndex();
              const isActive = index === activeIndex;

              return (
                <PostRow
                  post={item.data}
                  isActive={isActive}
                  onHover={() => setActiveIndex(index)}
                  onSelect={() => onSelectItem?.(item)}
                />
              );
            })}
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

function PostRow({
  post,
  isActive,
  onHover,
  onSelect,
}: {
  post: Post;
  isActive: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  const typeIcon =
    post.postType === "Question" ? (
      <BadgeQuestionMark size={16} />
    ) : post.postType === "Answer" ? (
      <MessageSquareDiff size={16} />
    ) : post.postType === "VIDEO" ? (
      <Video size={16} />
    ) : (
      <Pencil size={16} />
    );

  return (
    <li>
      <Link
        href={`/posts/${post._id}`}
        onMouseEnter={onHover}
        onClick={onSelect}
        className={`
          block px-4 py-2 border-b
          ${
            isActive
              ? "bg-gray-100 dark:bg-neutral-800"
              : "hover:bg-gray-50 dark:hover:bg-neutral-900"
          }
        `}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0">{typeIcon}</span>

          <span className="flex-1 text-sm font-medium truncate">
            {post.title || "(No title)"}
          </span>
        </div>

        <div className="mt-1 text-xs text-gray-500">{post.authorName}</div>
      </Link>
    </li>
  );
}
