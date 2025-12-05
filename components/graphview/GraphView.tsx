"use client";

import { useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { MathRenderer } from "@/components/math/MathRenderer";
import FullScreenLoader from "@/components/common/FullScreenLoader";

declare global {
  interface Window {
    vis?: any;
  }
}

interface CommentType {
  _id: string;
  authorName: string;
  createdAt: string;
  content: string;
  upvoteCount: number;
  upvoters: string[];
}

export default function GraphView({ post }: { post: any }) {
  const graphRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<any>(null);
  const nodesRef = useRef<any>(null);
  const edgesRef = useRef<any>(null);

  const graphBuiltRef = useRef(false); // ⭐ prevents rebuild

  const { user } = useCurrentUser();
  const userId = user?._id ?? "";

  const [scriptReady, setScriptReady] = useState(false);
  const [comments, setComments] = useState<CommentType[] | null>(null);
  const [usage, setUsage] = useState<any>(null);
  const [graphVisible, setGraphVisible] = useState(false);

  const popupRef = useRef<{ open: boolean; nodeId: string | null }>({
    open: false,
    nodeId: null,
  });

  /* Helpers */
  function getPreview(html: string, max = 12) {
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent || "").slice(0, max) + "...";
  }

  /* Load vis-network */
  useEffect(() => {
    if (window.vis) return setScriptReady(true);

    const script = document.createElement("script");
    script.src =
      "https://unpkg.com/vis-network/standalone/umd/vis-network.min.js";
    script.onload = () => setScriptReady(true);
    document.body.appendChild(script);
  }, []);

  /* Load comments */
  useEffect(() => {
    fetch(`/api/posts/${post._id}/comments`)
      .then((r) => r.json())
      .then(setComments);
  }, [post._id]);

  /* Load usage */
  useEffect(() => {
    if (!scriptReady) return;

    async function load() {
      const tagList = post.tags ?? [];
      const catList = post.categories?.map((c: any) => c.name) ?? [];

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

      setUsage({ tags: tags.usage ?? {}, categories: cats.usage ?? {} });
    }

    load();
  }, [scriptReady, post.tags, post.categories]);

  /* ⭐ BUILD GRAPH — RUNS ONCE ONLY */
  useEffect(() => {
    if (!scriptReady || !usage || !comments || !graphRef.current) return;

    if (graphBuiltRef.current) return; // ⭐ prevent rebuild
    graphBuiltRef.current = true;

    const vis = window.vis;
    nodesRef.current = new vis.DataSet();
    edgesRef.current = new vis.DataSet();

    function makeCommentLabel(comment: CommentType) {
      return `💬 ${getPreview(comment.content)}\n↑ ${comment.upvoteCount}`;
    }

    function makeBox(
      id: string,
      label: string,
      color: string,
      link: string | null
    ) {
      return {
        id,
        label,
        link,
        shape: "box",
        margin: 12,
        font: { color: "#fff", size: 14, multi: true },
        color: { background: color, border: "#111" },
        physics: true,
      };
    }

    /* MAIN POST NODE */
    nodesRef.current.add({
      ...makeBox(post._id, post.title, "#4CAF50", `/posts/${post._id}`),
      widthConstraint: { minimum: 300, maximum: 340 },
      margin: 20,
      font: { color: "#fff", size: 22, bold: true, multi: true },
      color: {
        background: "#43A047",
        border: "#1B5E20",
        highlight: { background: "#4CAF50", border: "#1B5E20" },
        hover: { background: "#4CAF50", border: "#1B5E20" },
      },
      borderWidth: 1,
      shapeProperties: { borderRadius: 10 },
      mass: 7,
    });

    /* USER NODE */
    const userNodeId = `user-${post.authorId}`;
    nodesRef.current.add(
      makeBox(
        userNodeId,
        `👤 ${post.authorName}`,
        "#2196F3",
        `/profile/${post.authorId}`
      )
    );

    edgesRef.current.add({
      from: post._id,
      to: userNodeId,
      length: 350,
      color: { color: "#4CAF50" },
    });

    /* GROUPS */
    const hasCategories = post.categories.length > 0;
    const hasTags = post.tags.length > 0;
    const hasComments = comments.length > 0;

    if (hasCategories)
      nodesRef.current.add(
        makeBox("group-categories", "📂 Categories", "#795548", null)
      );

    if (hasTags)
      nodesRef.current.add(makeBox("group-tags", "🏷 Tags", "#6A1B9A", null));

    if (hasComments)
      nodesRef.current.add(
        makeBox("group-comments", "💬 Comments", "#00838F", null)
      );

    if (hasCategories)
      edgesRef.current.add({
        from: post._id,
        to: "group-categories",
        length: 400,
        color: { color: "#4CAF50" },
      });

    if (hasTags)
      edgesRef.current.add({
        from: post._id,
        to: "group-tags",
        length: 400,
        color: { color: "#4CAF50" },
      });

    if (hasComments)
      edgesRef.current.add({
        from: post._id,
        to: "group-comments",
        length: 400,
        color: { color: "#4CAF50" },
      });

    /* CATEGORY CHILDREN */
    if (hasCategories) {
      post.categories.forEach((c: any) => {
        const u = usage.categories[c.name] ?? 1;

        nodesRef.current.add({
          id: `cat-${c.name}`,
          label: `${c.name}\n(${u})`,
          shape: "circle",
          font: { color: "#111", size: 14, multi: true, bold: true },
          color: { background: "#FFC107", border: "#111" },
          size: 20 + u * 2,
        });

        edgesRef.current.add({
          from: "group-categories",
          to: `cat-${c.name}`,
          length: 10,
          color: { color: "#FF9800" },
        });
      });
    }

    /* TAG CHILDREN */
    function shortenTag(tag: string, max = 7) {
      return tag.length > max ? tag.slice(0, max) + "…" : tag;
    }

    if (hasTags) {
      const tagUsages = post.tags.map((t: string) => usage.tags[t] ?? 1);
      const maxUsage = Math.max(...tagUsages);

      post.tags.forEach((t: string) => {
        const u = usage.tags[t] ?? 1;

        let dist = 25;
        if (u === maxUsage) dist = 5;
        else if (u >= maxUsage * 0.5) dist = 15;

        nodesRef.current.add({
          id: `tag-${t}`,
          label: `${shortenTag(t)}\n(${u})`,
          shape: "circle",
          font: { color: "#fff", size: 14, multi: true, bold: true },
          color: { background: "#9C27B0", border: "#111" },
          size: 20 + u * 2,
        });

        edgesRef.current.add({
          from: "group-tags",
          to: `tag-${t}`,
          length: dist,
          color: { color: "#AB47BC" },
        });
      });
    }

    /* COMMENT CHILDREN */
    if (hasComments) {
      comments.forEach((c) => {
        nodesRef.current.add({
          id: `comment-${c._id}`,
          label: makeCommentLabel(c),
          shape: "box",
          margin: 10,
          font: { color: "#fff", size: 14, multi: true },
          color: { background: "#00BCD4", border: "#006872" },
        });

        edgesRef.current.add({
          from: "group-comments",
          to: `comment-${c._id}`,
          length: 25,
          color: { color: "#00ACC1" },
        });
      });
    }

    /* NETWORK */
    const net = new vis.Network(
      graphRef.current,
      { nodes: nodesRef.current, edges: edgesRef.current },
      {
        physics: {
          enabled: true,
          solver: "repulsion",
          minVelocity: 0.01,
          repulsion: {
            nodeDistance: 120,
            springLength: 40,
            springConstant: 0.002,
            centralGravity: 0.2,
          },
        },
        interaction: {
          dragView: true,
          dragNodes: true,
          zoomView: true,
          hover: true,
        },
        edges: { smooth: false },
      }
    );

    networkRef.current = net;

    /* CLICK / DOUBLE CLICK LOGIC */
    let clickTimeout: any = null;

    net.on("click", (params: any) => {
      if (!params.nodes.length) return closePopup();

      const nodeId = params.nodes[0];

      if (clickTimeout) clearTimeout(clickTimeout);

      clickTimeout = setTimeout(() => {
        const state = popupRef.current;

        if (nodeId.startsWith("comment-")) {
          if (state.open && state.nodeId === nodeId) closePopup();
          else showCommentPopup(nodeId);
        } else {
          closePopup();
        }

        clickTimeout = null;
      }, 200);
    });

    net.on("doubleClick", async (params: any) => {
      if (clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
      }

      if (!params.nodes.length) return;

      const nodeId = params.nodes[0];
      if (!nodeId.startsWith("comment-")) return;

      const cid = nodeId.replace("comment-", "");
      await handleUpvoteComment(cid);
    });

    /* ────────────────────────────────
    DRAG FOCUS LOGIC
    ──────────────────────────────── */

    let draggedNode: string | null = null;
    let originalStyles: any = null;

    net.on("dragStart", (params: any) => {
      if (!params.nodes.length) return;

      draggedNode = params.nodes[0];

      // Save original styling of the node
      const node = nodesRef.current.get(draggedNode);
      originalStyles = {
        borderWidth: node.borderWidth ?? 1,
        borderColor: node.color?.border ?? "#111",
        background: node.color?.background,
      };

      // Apply focus style
      nodesRef.current.update({
        id: draggedNode,
        borderWidth: 1,
        color: {
          ...node.color,
          border: "#FFD700",
          background: "#FFF176",
        },
      });
    });

    net.on("dragEnd", () => {
      if (!draggedNode) return;

      // The REAL fix: deselect the node
      net.unselectAll();

      // Restore original visual style
      if (originalStyles) {
        nodesRef.current.update({
          id: draggedNode,
          borderWidth: originalStyles.borderWidth,
          color: {
            ...nodesRef.current.get(draggedNode)?.color,
            border: originalStyles.borderColor,
            background: originalStyles.background,
          },
        });
      }

      draggedNode = null;
      originalStyles = null;
    });

    /* Fade in once stable */
    let lastPos: any = null;
    let stableFrames = 0;

    function checkStable() {
      const pos = net.getPositions();
      if (!lastPos) {
        lastPos = pos;
        return requestAnimationFrame(checkStable);
      }

      let total = 0;
      let count = 0;
      for (const id in pos) {
        total += Math.hypot(
          pos[id].x - lastPos[id].x,
          pos[id].y - lastPos[id].y
        );
        count++;
      }

      if (total / count < 0.4) stableFrames++;
      else stableFrames = 0;

      if (stableFrames >= 10) {
        setGraphVisible(true);
        return;
      }

      lastPos = pos;
      requestAnimationFrame(checkStable);
    }

    requestAnimationFrame(checkStable);
  }, [scriptReady, usage, comments]);

  /* Only cleanup on unmount */
  useEffect(() => {
    return () => {
      try {
        networkRef.current?.destroy();
      } catch {}
    };
  }, []);

  /* POPUP */
  const [popup, setPopup] = useState({
    x: 0,
    y: 0,
    comment: null as CommentType | null,
  });

  function closePopup() {
    setPopup({ x: 0, y: 0, comment: null });
    popupRef.current = { open: false, nodeId: null };
  }

  function showCommentPopup(nodeId: string) {
    const net = networkRef.current;
    if (!net) return;

    const cid = nodeId.replace("comment-", "");
    const comment = comments?.find((c) => c._id === cid);
    if (!comment) return;

    const pos = net.getPositions([nodeId])[nodeId];
    const canvas = net.canvasToDOM(pos);

    setPopup({ x: canvas.x, y: canvas.y, comment });
    popupRef.current = { open: true, nodeId };
  }

  /* UPVOTE — DOES NOT REBUILD GRAPH */
  async function handleUpvoteComment(commentId: string) {
    if (!userId) return;

    const res = await fetch(`/api/posts/${commentId}/upvote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    const data = await res.json();
    const updated = data.comment as CommentType;

    setComments((prev) =>
      prev!.map((c) => (c._id === commentId ? updated : c))
    );

    nodesRef.current.update({
      id: `comment-${commentId}`,
      label: `💬 ${getPreview(updated.content)}\n↑ ${updated.upvoteCount}`,
    });

    setPopup((prev) =>
      prev.comment?._id === commentId ? { ...prev, comment: updated } : prev
    );
  }

  /* RENDER */
  const loading = !graphVisible;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {loading && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center"
          style={{
            pointerEvents: "none",
          }}
        >
          {/* Override FullScreenLoader’s full-screen CSS */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                // FORCE override FullScreenLoader's fixed positioning
                pointerEvents: "none",
              }}
              className="graph-loader-override"
            >
              <FullScreenLoader text="Loading graph…" />
            </div>
          </div>
        </div>
      )}

      <div
        ref={graphRef}
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: document.documentElement.classList.contains("dark")
            ? "#111"
            : "#fafafa",
          opacity: graphVisible ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      />

      {popup.comment && (
        <div
          id="comment-popup"
          style={{
            position: "absolute",
            top: popup.y,
            left: popup.x,
            transform: "translate(-50%, -140%)",
            background: "white",
            color: "black",
            padding: "14px",
            maxWidth: "300px",
            maxHeight: "300px",
            overflowY: "auto",
            borderRadius: "10px",
            border: "1px solid #ccc",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 999,
          }}
        >
          <strong>{popup.comment.authorName}</strong>

          <div className="text-xs text-gray-500">
            {new Date(popup.comment.createdAt).toLocaleString()}
          </div>

          <div className="mt-2 text-sm">
            <MathRenderer html={popup.comment.content} />
          </div>

          <button
            onClick={() => handleUpvoteComment(popup.comment!._id)}
            className="mt-3 text-blue-600 text-xs"
          >
            Upvote (↑ {popup.comment.upvoteCount})
          </button>
        </div>
      )}
    </div>
  );
}
