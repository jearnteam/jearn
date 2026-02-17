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
  createReferencePostNode,
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
  references?: {
    _id: string;
    title: string;
  }[];
};

type UsageMap = {
  tags: Record<string, number>;
  categories: Record<string, number>;
};

export default function GraphView({ post }: { post: GraphPost }) {
  const [currentPost, setCurrentPost] = useState<GraphPost>(post);
  const [history, setHistory] = useState<GraphPost[]>([post]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [graphError, setGraphError] = useState<string | null>(null);
  const graphRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<any>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const [scriptReady, setScriptReady] = useState(false);
  const [comments, setComments] = useState<CommentType[] | null>(null);
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const [references, setReferences] = useState<
    { _id: string; title: string }[] | null
  >(null);
  const [usage, setUsage] = useState<UsageMap | null>(null);
  const [graphReady, setGraphReady] = useState(false);

  const [popup, setPopup] = useState<{
    x: number;
    y: number;
    comment: CommentType | null;
    visible: boolean;
  }>({ x: 0, y: 0, comment: null, visible: false });
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);
  const palette = getGraphPalette(isDark);

  function switchToPost(newPost: GraphPost) {
    setGraphReady(false);
    setComments(null);
    setReferences(null);
    setUsage(null);

    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, newPost];
    });

    setHistoryIndex((prev) => prev + 1);
    setCurrentPost(newPost);
  }

  async function safeFetch(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed: ${url}`);
    return res.json();
  }

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
  useEffect(() => {
    setGraphError(null);

    fetch(`/api/posts/${currentPost._id}/graph`)
      .then((r) => r.json())
      .then((data) => {
        setComments(data.comments ?? []);
        setCommentCount(data.commentCount ?? 0);
        setReferences(data.references ?? []);
        setUsage(data.usage ?? { tags: {}, categories: {} });
      })
      .catch(() => {
        setGraphError("Failed to load graph data");
        setComments([]);
        setReferences([]);
        setUsage({ tags: {}, categories: {} });
        setCommentCount(0);
      });
  }, [currentPost._id]);

  /* ---------------- Build Graph ---------------- */
  const dataReady =
    scriptReady && comments !== null && references !== null && usage !== null;
  useEffect(() => {
    if (!dataReady || !graphRef.current) return;

    setGraphError(null); // clear old errors

    // 🔥 Destroy old network
    if (networkRef.current) {
      networkRef.current.destroy();
      networkRef.current = null;
    }

    const vis = window.vis;
    const nodes = new vis.DataSet();
    const edges = new vis.DataSet();

    /* ---------- POST ---------- */
    nodes.add(
      createPostNode(
        {
          _id: currentPost._id,
          label: safeTextPreview(currentPost.title, 28),
        },
        palette,
        isDark
      )
    );

    /* ---------- AUTHOR ---------- */

    const authorNodeId = `author-${currentPost.authorId}`;
    nodes.add(
      createAuthorNode(
        currentPost.authorId,
        currentPost.authorName,
        palette,
        isDark
      )
    );

    edges.add({ from: currentPost._id, to: `author-${currentPost.authorId}` });

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

    edges.add({ from: currentPost._id, to: "hub-categories" });

    currentPost.categories.forEach((c) => {
      const count = usage.categories[c.name] ?? 0;
      const id = `cat-${c.name}`;

      nodes.add(
        createBoxNode(
          id,
          `${c.name}\n(${count})`,
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

    edges.add({ from: currentPost._id, to: "hub-tags" });

    currentPost.tags.forEach((tag) => {
      const count = usage.tags[tag] ?? 0;
      const id = `tag-${tag}`;

      nodes.add(
        createBoxNode(
          id,
          `#${tag}\n(${count})`,
          palette.tag,
          isDark ? "#1e293b" : "#ffffff",
          palette,
          isDark,
          1.5
        )
      );

      edges.add({ from: "hub-tags", to: id, dashes: true });
    });

    /* ---------- REFERENCE HUB ---------- */

    const referenceHub = "hub-references";

    nodes.add(
      createHubNode(
        referenceHub,
        "/icons/graph/link.svg", // light icon
        "/icons/graph/link-dark.svg", // dark icon
        palette.post, // or custom blue
        palette,
        isDark
      )
    );

    // main post → reference hub
    edges.add({ from: currentPost._id, to: referenceHub });

    // reference hub → referenced posts
    references.forEach((ref) => {
      const refNodeId = `ref-${ref._id}`;

      nodes.add(
        createReferencePostNode(
          {
            _id: ref._id,
            label: safeTextPreview(ref.title, 24),
          },
          palette,
          isDark
        )
      );

      edges.add({
        from: referenceHub,
        to: refNodeId,
        dashes: true,
        length: 120,
      });
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
        isDark,
        commentCount !== null ? `${commentCount}` : ""
      )
    );

    edges.add({ from: currentPost._id, to: "hub-comments" });
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

    let didStabilize = false;

    const timeout = setTimeout(() => {
      if (!didStabilize) {
        setGraphError("Graph stabilization timeout");
      }
    }, 5000);

    net.once("stabilizationIterationsDone", () => {
      didStabilize = true;
      clearTimeout(timeout);

      net.focus(currentPost._id, {
        scale: 1.2,
        animation: true,
      });

      setGraphReady(true);
    });

    // 🧠 Fallback if vis skips stabilization
    net.once("afterDrawing", () => {
      if (!didStabilize) {
        clearTimeout(timeout);
        setGraphReady(true);
      }
    });

    net.on("click", (params: any) => {
      if (!params.nodes?.length) {
        closePopup();
        setSelectedPost(null);
        return;
      }

      const nodeId = params.nodes[0];

      /* ---------- Reference post ---------- */
      if (nodeId.startsWith("ref-")) {
        const postId = nodeId.replace("ref-", "");

        fetch(`/api/posts/${postId}`)
          .then((r) => r.json())
          .then((fullPost) => {
            switchToPost(fullPost);
          })
          .catch(() => {});

        return;
      }

      /* ---------- Main post ---------- */
      if (nodeId === currentPost._id) {
        fetch(`/api/posts/${currentPost._id}`)
          .then((r) => r.json())
          .then((fullPost) => {
            setSelectedPost(fullPost);
          })
          .catch(() => {});

        closePopup();
        return;
      }

      /* ---------- Comment ---------- */
      if (nodeId.startsWith("comment-")) {
        showCommentPopup(nodeId);
        setSelectedPost(null);
        return;
      }

      closePopup();
      setSelectedPost(null);
    });

    return () => {
      clearTimeout(timeout);
    };
  }, [dataReady, currentPost._id, isDark]);

  function retryGraph() {
    setGraphError(null);
    setGraphReady(false);

    setComments(null);
    setReferences(null);
    setUsage(null);

    // Just re-trigger effects naturally
    setCurrentPost((prev) => ({
      ...prev,
      _reloadToken: Date.now(),
    }));
  }

  function goBack() {
    if (historyIndex === 0) return;

    const prevPost = history[historyIndex - 1];

    setGraphReady(false);
    setComments(null);
    setReferences(null);
    setUsage(null);

    setHistoryIndex((i) => i - 1);
    setCurrentPost(prevPost);
  }

  function goForward() {
    if (historyIndex >= history.length - 1) return;

    const nextPost = history[historyIndex + 1];

    setGraphReady(false);
    setComments(null);
    setReferences(null);
    setUsage(null);

    setHistoryIndex((i) => i + 1);
    setCurrentPost(nextPost);
  }

  /* ---------------- Render ---------------- */

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: palette.background,
        borderRadius: 12,
      }}
    >
      <div
        ref={graphRef}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 12,
          opacity: graphReady ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          display: "flex",
          gap: 8,
          zIndex: 10,
        }}
      >
        <button
          onClick={goBack}
          disabled={historyIndex === 0}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            opacity: historyIndex === 0 ? 0.4 : 1,
          }}
        >
          ←
        </button>

        <button
          onClick={goForward}
          disabled={historyIndex >= history.length - 1}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            opacity: historyIndex >= history.length - 1 ? 0.4 : 1,
          }}
        >
          →
        </button>
      </div>

      {!graphReady && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            color: palette.text,
          }}
        >
          {graphError ? (
            <>
              <div>⚠ {graphError}</div>
              <button
                onClick={retryGraph}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid",
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
            </>
          ) : (
            <div>Loading graph...</div>
          )}
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
