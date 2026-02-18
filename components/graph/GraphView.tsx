"use client";

import { useEffect, useRef, useState } from "react";
import PostPopup from "./PostPopup";
import { Post, PostTypes } from "@/types/post";
import { getGraphPalette } from "./graphTheme";
import { buildCommentTree } from "@/lib/buildCommentTree";
import { getGraphOptions } from "./graphOptions";
import { safeTextPreview } from "./graphUtils";
import { Network, DataSet, Node, Edge, Options } from "vis-network/standalone";
import {
  createPostNode,
  createAuthorNode,
  createHubNode,
  createBoxNode,
  createReferencePostNode,
  createMentionUserNode,
} from "./graphNodeFactory";
import CommentPopup from "./CommentPopup";

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
  const [comments, setComments] = useState<CommentType[] | null>(null);
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const [mentions, setMentions] = useState<
    { _id: string; name: string; uniqueId?: string }[] | null
  >(null);
  const [references, setReferences] = useState<{
    outgoing: { _id: string; title: string }[];
    incoming: { _id: string; title: string }[];
  } | null>(null);
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
  const EMPTY_REFERENCES = { outgoing: [], incoming: [] };
  useEffect(() => {
    setGraphError(null);

    fetch(`/api/posts/${currentPost._id}/graph`)
      .then((r) => r.json())
      .then((data) => {
        setComments(data.comments ?? []);
        setCommentCount(data.commentCount ?? 0);
        setReferences(data.references ?? EMPTY_REFERENCES);
        setUsage(data.usage ?? { tags: {}, categories: {} });
        setMentions(data.mentions ?? []);
      })
      .catch(() => {
        setGraphError("Failed to load graph data");
        setComments([]);
        setReferences(EMPTY_REFERENCES);
        setUsage({ tags: {}, categories: {} });
        setCommentCount(0);
        setMentions([]);
      });
  }, [currentPost._id]);

  /* ---------------- Build Graph ---------------- */
  const dataReady =
    comments !== null &&
    references !== null &&
    usage !== null &&
    mentions !== null;
  useEffect(() => {
    if (!dataReady || !graphRef.current) return;

    setGraphError(null); // clear old errors

    // 🔥 Destroy old network
    if (networkRef.current) {
      networkRef.current.destroy();
      networkRef.current = null;
    }

    const nodes = new DataSet<Node>();
    const edges = new DataSet<Edge>();
    const options: Options = getGraphOptions();
    const net = new Network(graphRef.current, { nodes, edges }, options);

    net.setOptions({
      physics: { enabled: true },
    });
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
    nodes.add(
      createAuthorNode(
        currentPost.authorId,
        currentPost.authorName,
        palette,
        isDark
      )
    );

    edges.add({
      from: currentPost._id,
      to: `author-${currentPost.authorId}`,
    });

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

    Object.entries(usage.categories).forEach(([name, count]) => {
      const id = `cat-${name}`;

      nodes.add(
        createBoxNode(
          id,
          `${name}\n(${count})`,
          palette.category,
          isDark ? "#1e293b" : "#ffffff",
          palette,
          isDark,
          2
        )
      );

      edges.add({ from: "hub-categories", to: id });
    });

    /* ---------- MENTION HUB ---------- */

    const mentionHubId = "hub-mentions";

    nodes.add(
      createHubNode(
        mentionHubId,
        "/icons/graph/at-sign.svg",
        "/icons/graph/at-sign-dark.svg",
        "#ef4444",
        palette,
        isDark
      )
    );

    edges.add({
      from: currentPost._id,
      to: mentionHubId,
    });

    mentions.forEach((user) => {
      const nodeId = `mention-${user._id}`;

      nodes.add(
        createMentionUserNode(
          user._id,
          `@${user.uniqueId ?? user.name}`,
          palette.category,
          isDark
        )
      );

      edges.add({
        from: mentionHubId,
        to: nodeId,
        color: {
          color: palette.mention, // normal
          highlight: palette.mention, // when selected
          hover: palette.mention, // when hovered
          inherit: false, // VERY important
        },
        smooth: {
          enabled: true,
          type: "cubicBezier",
          roundness: 0.1,
        },
        length: 80,
      });
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
        "/icons/graph/link.svg",
        "/icons/graph/link-dark.svg",
        palette.post,
        palette,
        isDark
      )
    );

    // Connect main post <-> hub (NO arrows)
    edges.add({
      from: currentPost._id,
      to: referenceHub,
    });

    references?.outgoing.forEach((ref) => {
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
        arrows: "to", // OUTGOING arrow
        dashes: true,
        length: 140,
        color: { color: palette.post },
        smooth: {
          enabled: true,
          type: "cubicBezier",
          roundness: 0.1,
        },
      });
    });

    references?.incoming.forEach((ref) => {
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
        from: refNodeId,
        to: referenceHub,
        arrows: "to", // arrow pointing toward hub
        dashes: true,
        length: 140,
        color: { color: palette.category },
        smooth: {
          enabled: true,
          type: "cubicBezier",
          roundness: 0.1,
        },
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
        smooth: {
          enabled: true,
          type: "cubicBezier",
          roundness: 0.1,
        },
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

    networkRef.current = net;

    net.once("stabilized", () => {
      net.setOptions({
        physics: true,
      });

      // Fit instantly (still hidden)
      net.fit({
        animation: false,
      });

      // Center instantly (still hidden)
      net.focus(currentPost._id, {
        scale: 0.6,
        animation: false,
      });

      // 🔥 DO NOT show graph yet
      setGraphReady(true);

      // 🔥 Wait one frame — then show + animate together
      requestAnimationFrame(() => {
        if (graphRef.current) {
          graphRef.current.style.visibility = "visible";
        }

        net.focus(currentPost._id, {
          scale: 1.25,
          animation: {
            duration: 900,
            easingFunction: "easeOutCubic",
          },
        });
      });
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

      /* ---------- Mention User ---------- */
      if (nodeId.startsWith("mention-")) {
        const userId = nodeId.replace("mention-", "");

        fetch(`/api/users/${userId}`)
          .then((r) => r.json())
          .then((userProfile) => {
            console.log("User clicked:", userProfile);
            // You can open user popup here later
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
