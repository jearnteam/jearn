"use client";

import type { Post } from "@/types/post";
import PostItem from "./PostItem/PostItem";
import { motion } from "framer-motion";
import { useMemo, useRef, useEffect, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";

export type VotePollResult = {
  poll: Post["poll"];
  votedOptionIds: string[];
};

interface Props {
  posts: Post[];
  hasMore: boolean;
  onLoadMore: () => void;
  onEdit: (post: Post) => void;
  onDelete: (id: string) => Promise<void>;
  onVote?: (
    postId: string,
    optionId: string
  ) => Promise<{
    poll: Post["poll"];
    votedOptionIds: string[];
  } | null>;

  onUpvote: (id: string) => Promise<void>;
  onAnswer: (post: Post) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;

  /** 🔑 OPTIONAL view namespace */
  viewId?: string;
}

export default function PostList({
  posts,
  hasMore,
  onLoadMore,
  onEdit,
  onDelete,
  onUpvote,
  onVote,
  onAnswer,
  scrollContainerRef,
  viewId,
}: Props) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const safePosts = useMemo(() => (Array.isArray(posts) ? posts : []), [posts]);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  /* ---------------- SCROLL RESTORE ---------------- */
  // 既存の sessionStorage ロジックを Virtuoso のメソッドに適応
  useEffect(() => {
    if (!isMounted) return;
    // マウント時に一度だけチェック
    const fromNav = sessionStorage.getItem("from-navigation");
    const restoreId = sessionStorage.getItem("restore-post-id");

    if (fromNav && restoreId && safePosts.length > 0) {
      const index = safePosts.findIndex((p) => p._id === restoreId);
      if (index !== -1) {
        // 少し遅延させてスクロール位置を復元（Virtuosoの初期化待ち）
        requestAnimationFrame(() => {
          virtuosoRef.current?.scrollToIndex({
            index,
            align: "start",
            behavior: "auto", // 即座にジャンプ
          });
        });
      }
      // クリーンアップ
      sessionStorage.removeItem("restore-post-id");
      sessionStorage.removeItem("from-navigation");
    }
  }, [isMounted]);

  /* ---------------- SCROLL PARENT RESOLUTION ---------------- */
  // scrollContainerRef が渡されているのに current が null の場合（＝初期レンダリング時）
  // Virtuoso に undefined を渡してしまうと Window スクロールモードで暴走してしまうため、
  // ref が解決するまで（isMountedまで）待機するのが安全。
  
  // Refが渡されていない(=Windowスクロール) 場合は即座に true
  // Refが渡されている場合は、current が存在するまで待つ
  const isScrollParentReady = !scrollContainerRef || !!scrollContainerRef.current;

  // まだ準備できていないなら、ローディングか空を返す（一瞬なので目視できないレベル）
  if (!isScrollParentReady && !isMounted) {
    return <div className="h-full w-full" />; 
  }

  /* ---------------- RENDER ---------------- */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={!scrollContainerRef ? "w-full min-h-screen" : "w-full h-full"} // Virtuosoには高さが必要（親に合わせる）
    >
      <Virtuoso
        ref={virtuosoRef}
        useWindowScroll={!scrollContainerRef} // Refがない場合はWindowスクロール
        customScrollParent={scrollContainerRef?.current ?? undefined} // Refがある場合はそれを使う
        data={safePosts}
        endReached={() => {
          if (hasMore) onLoadMore();
        }}
        overscan={500} // 描画領域の上下500pxを予備でレンダリング（チラつき防止）
        increaseViewportBy={{
          top: 800,
          bottom: 800,
        }} // さらに余裕を持たせる
        // 各アイテムのレンダリング
        itemContent={(index, post) => {
          const key = viewId ? `${viewId}:${post._id}` : post._id;

          return (
            <div className="pb-[2px]">
              <PostItem
                key={key}
                index={index} // 🔥 ADD THIS
                virtuosoRef={virtuosoRef} // 🔥 ADD THIS
                post={post}
                onEdit={() => onEdit(post)}
                onDelete={() => onDelete(post._id)}
                onUpvote={(id) => onUpvote(id)}
                onVote={onVote}
                onAnswer={onAnswer}
                scrollContainerRef={scrollContainerRef}
              />
            </div>
          );
        }}
        // フッター（ローディング表示）
        components={{
          Footer: () => {
            if (!hasMore) return null;
            return (
              <div className="h-16 flex items-center justify-center text-gray-500">
                Loading...
              </div>
            );
          },
        }}
      />
    </motion.div>
  );
}
