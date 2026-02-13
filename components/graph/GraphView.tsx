"use client";

import { useEffect, useRef, useState } from "react";
import PostPopup from "./PostPopup";
import { Post, PostTypes } from "@/types/post";
import { getGraphPalette } from "./graphTheme";
import { buildCommentTree } from "@/lib/buildCommentTree";
import { getGraphOptions } from "./graphOptions";
import { safeTextPreview } from "./graphUtils";
import {
  createPostNode,
  createAuthorNode,
  createHubNode,
  createBoxNode,
} from "./graphNodeFactory";
import CommentPopup from "./CommentPopup";

declare global {
  interface Window {
    vis?: any;
  }
}

interface CommentType {
  _id: string;
  authorName: string;
  content: string;
  upvoteCount: number;

  postType?: string;
  title?: string;
  createdAt: string | Date;
  authorAvatarUpdatedAt?: string | Date;
  authorUniqueId?: string;
}

type GraphPost = {
  _id: string;
  title: string;
  authorId: string;
  authorName: string;
  tags: string[];
  categories: { name: string }[];
};

type UsageMap = {
  tags: Record<string, number>;
  categories: Record<string, number>;
};

export default function GraphView({ post }: { post: GraphPost }) {
  const graphRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<any>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const [scriptReady, setScriptReady] = useState(false);
  const [comments, setComments] = useState<CommentType[] | null>(null);
  const [usage, setUsage] = useState<UsageMap | null>(null);
  const [graphReady, setGraphReady] = useState(false);

  const [popup, setPopup] = useState<{
    x: number;
    y: number;
    comment: CommentType | null;
    visible: boolean;
  }>({ x: 0, y: 0, comment: null, visible: false });
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const isDark =
    typeof window !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const palette = getGraphPalette(isDark);

  function closePopup() {
    setPopup({ x: 0, y: 0, comment: null, visible: false });
  }

  function showCommentPopup(nodeId: string) {
    if (!networkRef.current || !comments) return;

    const cid = nodeId.replace("comment-", "");
    const comment = comments.find((c) => c._id === cid);
    if (!comment) return;

    const pos = networkRef.current.getPositions([nodeId])[nodeId];
    const dom = networkRef.current.canvasToDOM(pos);

    setPopup({
      x: dom.x,
      y: dom.y,
      comment,
      visible: false,
    });

    requestAnimationFrame(() => {
      if (!popupRef.current || !graphRef.current) return;

      const rect = popupRef.current.getBoundingClientRect();
      const graphRect = graphRef.current.getBoundingClientRect();

      let newX = dom.x;
      let newY = dom.y - rect.height - 12;

      const padding = 16;

      /* ---------- Clamp vertically inside graph ---------- */
      if (newY < graphRect.top + padding) {
        newY = graphRect.top + padding;
      }

      if (newY + rect.height > graphRect.bottom - padding) {
        newY = graphRect.bottom - rect.height - padding;
      }

      /* ---------- Clamp horizontally inside graph ---------- */
      if (newX - rect.width / 2 < graphRect.left + padding) {
        newX = graphRect.left + rect.width / 2 + padding;
      }

      if (newX + rect.width / 2 > graphRect.right - padding) {
        newX = graphRect.right - rect.width / 2 - padding;
      }

      setPopup({
        x: newX,
        y: newY,
        comment,
        visible: true,
      });
    });
  }

  /* ---------------- Load vis ---------------- */

  useEffect(() => {
    if (window.vis) {
      setScriptReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://unpkg.com/vis-network/standalone/umd/vis-network.min.js";
    script.onload = () => setScriptReady(true);
    document.body.appendChild(script);
  }, []);

  /* ---------------- Fetch comments ---------------- */

  useEffect(() => {
    fetch(`/api/posts/${post._id}/comments`)
      .then((r) => r.json())
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .catch(() => setComments([]));
  }, [post._id]);

  /* ---------------- Fetch usage ---------------- */

  useEffect(() => {
    if (!scriptReady) return;

    async function load() {
      const tagList = post.tags ?? [];
      const catList = post.categories.map((c) => c.name);

      const [tagsRes, catsRes] = await Promise.all([
        fetch("/api/tags/usage/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags: tagList }),
        }),
        fetch("/api/category/usage/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categories: catList }),
        }),
      ]);

      const tags = await tagsRes.json();
      const cats = await catsRes.json();

      setUsage({
        tags: tags.usage ?? {},
        categories: cats.usage ?? {},
      });
    }

    load();
  }, [scriptReady, post.tags, post.categories]);

  /* ---------------- Build Graph ---------------- */

  useEffect(() => {
    if (
      !scriptReady ||
      !graphRef.current ||
      comments === null ||
      usage === null ||
      networkRef.current
    )
      return;

    const vis = window.vis;
    const nodes = new vis.DataSet();
    const edges = new vis.DataSet();

    /* ---------- POST ---------- */
    nodes.add(
      createPostNode(
        {
          _id: post._id,
          label: safeTextPreview(post.title, 28),
        },
        palette,
        isDark
      )
    );

    /* ---------- AUTHOR ---------- */

    const authorNodeId = `author-${post.authorId}`;
    nodes.add(
      createAuthorNode(post.authorId, post.authorName, palette, isDark)
    );

    edges.add({ from: post._id, to: `author-${post.authorId}` });

    /* ---------- CATEGORY HUB ---------- */

    const categoryHub = "hub-categories";
    nodes.add(
      createHubNode(
        "hub-categories",
        "/icons/graph/folder-git-2.svg",
        "/icons/graph/folder-git-2-dark.svg",
        palette.category,
        palette,
        isDark
      )
    );

    edges.add({ from: post._id, to: "hub-categories" });

    post.categories.forEach((c) => {
      const count = usage.categories[c.name] ?? 0;
      const id = `cat-${c.name}`;

      nodes.add(
        createBoxNode(
          id,
          `#${c.name}\n(${count})`,
          palette.category,
          isDark ? "#1e293b" : "#ffffff",
          palette,
          isDark,
          2
        )
      );

      edges.add({ from: "hub-categories", to: id });
    });

    /* ---------- TAG HUB ---------- */

    const tagHub = "hub-tags";
    nodes.add(
      createHubNode(
        "hub-tags",
        "/icons/graph/tag.svg",
        "/icons/graph/tag-dark.svg",
        palette.tag,
        palette,
        isDark
      )
    );

    edges.add({ from: post._id, to: "hub-tags" });

    post.tags.forEach((tag) => {
      const count = usage.tags[tag] ?? 0;
      const id = `tag-${tag}`;

      nodes.add(
        createBoxNode(
          id,
          `@${tag}\n(${count})`,
          palette.tag,
          isDark ? "#1e293b" : "#ffffff",
          palette,
          isDark,
          1.5
        )
      );

      edges.add({ from: "hub-tags", to: id, dashes: true });
    });

    /* ---------- COMMENT HUB ---------- */

    const commentHub = "hub-comments";
    nodes.add(
      createHubNode(
        "hub-comments",
        "/icons/graph/message-circle.svg",
        "/icons/graph/message-circle-dark.svg",
        palette.comment,
        palette,
        isDark
      )
    );

    edges.add({ from: post._id, to: "hub-comments" });
    const commentTree = buildCommentTree(comments as any);
    function addCommentNode(node: any, parentId: string) {
      const id = `comment-${node._id}`;

      const label =
        node.postType === PostTypes.ANSWER && node.title
          ? safeTextPreview(node.title, 10)
          : safeTextPreview(node.content, 10);

      nodes.add(
        createBoxNode(
          id,
          label,
          palette.comment,
          isDark ? "#1e293b" : "#ffffff",
          palette,
          isDark,
          1
        )
      );

      edges.add({
        from: parentId,
        to: id,
        smooth: { type: "cubicBezier", roundness: 0.1 },
        physics: true,
        length: 75,
      });

      // recursively add children
      node.children?.forEach((child: any) => {
        addCommentNode(child, id);
      });
    }
    commentTree.forEach((rootComment: any) => {
      addCommentNode(rootComment, commentHub);
    });

    const net = new vis.Network(
      graphRef.current,
      { nodes, edges },
      getGraphOptions()
    );

    networkRef.current = net;

    net.once("stabilizationIterationsDone", () => {
      net.focus(post._id, { scale: 1.2, animation: true });
      setGraphReady(true);
    });

    net.on("click", (params: any) => {
      if (!params.nodes?.length) {
        closePopup();
        setSelectedPost(null);
        return;
      }

      const nodeId = params.nodes[0];

      if (nodeId === post._id) {
        closePopup();

        fetch(`/api/posts/${post._id}`)
          .then((r) => r.json())
          .then((fullPost) => {
            setSelectedPost(fullPost);
          })
          .catch(() => {});

        return;
      }

      if (nodeId.startsWith("comment-")) {
        showCommentPopup(nodeId);
        setSelectedPost(null);
        return;
      }

      closePopup();
      setSelectedPost(null);
    });
  }, [scriptReady, comments, usage]);

  /* ---------------- Render ---------------- */

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        ref={graphRef}
        style={{
          width: "100%",
          height: "100%",
          background: palette.background,
          borderRadius: 12,
          opacity: graphReady ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      />

      {!graphReady && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: palette.text,
          }}
        >
          Loading graph...
        </div>
      )}

      {popup.comment && (
        <CommentPopup
          comment={popup.comment}
          onClose={closePopup}
          onUpvote={async (id) => {
            // implement your upvote logic here if needed
            console.log("Upvote", id);
          }}
        />
      )}

      {selectedPost && (
        <PostPopup
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onVote={async (postId, optionId) => {
            const res = await fetch("/api/posts/polls/vote", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ postId, optionId }),
            });

            if (!res.ok) return null;

            const { poll, votedOptionIds } = await res.json();

            // 🔥 Update popup post state directly
            setSelectedPost((prev) =>
              prev
                ? {
                    ...prev,
                    poll: {
                      ...poll,
                      votedOptionIds,
                    },
                  }
                : prev
            );

            return { poll, votedOptionIds };
          }}
        />
      )}
    </div>
  );
}
