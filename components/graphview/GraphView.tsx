"use client";

import { useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

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
  const ref = useRef<HTMLDivElement>(null);

  const networkRef = useRef<any>(null);
  const nodesRef = useRef<any>(null);
  const edgesRef = useRef<any>(null);

  const { user } = useCurrentUser();
  const userId = user?._id ?? "";

  const [ready, setReady] = useState(false);
  const [comments, setComments] = useState<CommentType[] | null>(null);

  /* Load vis-network */
  useEffect(() => {
    if (window.vis) {
      setReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://unpkg.com/vis-network/standalone/umd/vis-network.min.js";
    script.async = true;
    script.onload = () => setReady(true);
    document.body.appendChild(script);
  }, []);

  /* Load comments */
  useEffect(() => {
    async function loadComments() {
      const res = await fetch(`/api/posts/${post._id}/comments`);
      const data = await res.json();
      setComments(data);
    }
    loadComments();
  }, [post._id]);

  /* Build graph */
  useEffect(() => {
    if (!ready || !comments || !ref.current) return;

    const vis = window.vis;

    nodesRef.current = new vis.DataSet([]);
    edgesRef.current = new vis.DataSet([]);

    /* Node creator */
    function makeNode(id: string, label: string, color: string, link: string) {
      return {
        id,
        label,
        link,
        shape: "box",
        margin: 10,
        font: { color: "#fff", size: 14 },
        color: {
          background: color,
          border: "#222",
        },
      };
    }

    /* Add nodes */
    nodesRef.current.add(
      makeNode(post._id, post.title, "#4CAF50", `/posts/${post._id}`)
    );

    nodesRef.current.add(
      makeNode(
        `user-${post.authorId}`,
        `👤 ${post.authorName}`,
        "#2196F3",
        `/profile/${post.authorId}`
      )
    );

    edgesRef.current.add({
      from: post._id,
      to: `user-${post.authorId}`,
    });

    post.categories.forEach((c: any) => {
      nodesRef.current.add(
        makeNode(`cat-${c.name}`, `📁 ${c.name}`, "#FFC107", `/category/${c.name}`)
      );
      edgesRef.current.add({ from: post._id, to: `cat-${c.name}` });
    });

    post.tags.forEach((t: string) => {
      nodesRef.current.add(
        makeNode(`tag-${t}`, `🏷 ${t}`, "#9C27B0", `/tags/${t}`)
      );
      edgesRef.current.add({ from: post._id, to: `tag-${t}` });
    });

    comments.forEach((c, i) => {
      nodesRef.current.add(
        makeNode(`comment-${c._id}`, `💬 Comment ${i + 1}`, "#00BCD4", `/posts/${c._id}`)
      );
      edgesRef.current.add({ from: post._id, to: `comment-${c._id}` });
    });

    /* Init network */
    const net = new vis.Network(
      ref.current,
      { nodes: nodesRef.current, edges: edgesRef.current },
      {
        physics: { enabled: true, stabilization: false },
        nodes: { shape: "box" },
        interaction: { hover: true },
      }
    );

    networkRef.current = net;

    /* Load icon */
    const ICON = new Image();
    ICON.src = "/icons/link-icon.png"; // 48x48

    /* Draw icon INSIDE node, ALWAYS on top */
    net.on("afterDrawing", (ctx: CanvasRenderingContext2D) => {
      if (!ICON.complete) return;

      const allNodes = nodesRef.current.get();

      allNodes.forEach((node: any) => {
        const box = net.getBoundingBox(node.id);
        if (!box) return;

        // place icon INSIDE the box (bottom-right)
        const iconSize = 20;
        const padding = 8;

        const x = box.right - iconSize - padding;
        const y = box.bottom - iconSize - padding;

        ctx.drawImage(ICON, x, y, iconSize, iconSize);
      });
    });

    /* Click detection inside icon zone */
    net.on("click", (params: any) => {
      if (!params.nodes.length) return;
      const nodeId = params.nodes[0];
      const node = nodesRef.current.get(nodeId);
      if (!node) return;

      const pointer = params.pointer.canvas;
      const box = net.getBoundingBox(nodeId);

      const iconSize = 20;
      const padding = 8;
      const x = box.right - iconSize - padding;
      const y = box.bottom - iconSize - padding;

      const inside =
        pointer.x >= x &&
        pointer.x <= x + iconSize &&
        pointer.y >= y &&
        pointer.y <= y + iconSize;

      if (inside) window.open(node.link, "_blank");
    });
  }, [ready, comments]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {!comments && (
        <div className="text-center text-white mt-10">Loading graph...</div>
      )}
      <div ref={ref} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
