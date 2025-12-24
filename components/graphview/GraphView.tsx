"use client";

import { useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { MathRenderer } from "@/components/math/MathRenderer";
import FullScreenLoader from "@/components/common/FullScreenLoader";

/* -------------------------------------------------------------------------- */
/*                                VIS TYPES                                   */
/* -------------------------------------------------------------------------- */

declare global {
  interface Window {
    vis?: {
      DataSet: new <T = unknown>(items?: T[]) => VisDataSet<T>;
      Network: new (
        container: HTMLElement,
        data: { nodes: VisDataSet; edges: VisDataSet },
        options?: Record<string, unknown>
      ) => VisNetwork;
    };
  }
}

/**
 * vis-network nodes are EXTREMELY dynamic.
 * Trying to strictly type them is a losing battle.
 * This shape matches what we actually use.
 */
type VisNode = {
  id: string;
  label?: string;
  shape?: string;
  margin?: number;
  font?: Record<string, unknown>;
  physics?: boolean;
  mass?: number;
  size?: number;
  widthConstraint?: Record<string, number>;
  shapeProperties?: Record<string, unknown>;
  color?: {
    border?: string;
    background?: string;
    highlight?: Record<string, string>;
    hover?: Record<string, string>;
  };
  [key: string]: unknown; // 👈 REQUIRED for vis-network
};

interface VisDataSet<T = unknown> {
  add(item: T | T[]): void;
  update(item: T | T[]): void;
  get(id: string): T;
}

interface VisNetwork {
  on(event: string, cb: (params: { nodes?: string[] }) => void): void;
  unselectAll(): void;
  destroy(): void;
  getPositions(ids?: string[]): Record<string, { x: number; y: number }>;
  canvasToDOM(pos: { x: number; y: number }): { x: number; y: number };
}

/* -------------------------------------------------------------------------- */
/*                               DATA TYPES                                   */
/* -------------------------------------------------------------------------- */

interface CommentType {
  _id: string;
  authorName: string;
  createdAt: string;
  content: string;
  upvoteCount: number;
  upvoters: string[];
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

/* -------------------------------------------------------------------------- */
/*                                COMPONENT                                   */
/* -------------------------------------------------------------------------- */

export default function GraphView({ post }: { post: GraphPost }) {
  const graphRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<VisNetwork | null>(null);
  const nodesRef = useRef<VisDataSet<VisNode> | null>(null);
  const edgesRef = useRef<VisDataSet | null>(null);

  const graphBuiltRef = useRef(false);

  const { user } = useCurrentUser();
  const userId = user?._id ?? "";

  const [scriptReady, setScriptReady] = useState(false);
  const [comments, setComments] = useState<CommentType[] | null>(null);
  const [usage, setUsage] = useState<UsageMap | null>(null);
  const [graphVisible, setGraphVisible] = useState(false);

  const popupRef = useRef<{ open: boolean; nodeId: string | null }>({
    open: false,
    nodeId: null,
  });

  /* -------------------------------- Helpers -------------------------------- */

  function getPreview(html: string, max = 12) {
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent || "").slice(0, max) + "...";
  }

  /* ---------------------------- Load vis-network ---------------------------- */

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

  /* ------------------------------- Load data -------------------------------- */

  useEffect(() => {
    fetch(`/api/posts/${post._id}/comments`)
      .then((r) => r.json())
      .then(setComments);
  }, [post._id]);

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

  /* ----------------------------- BUILD GRAPH -------------------------------- */

  useEffect(() => {
    if (!scriptReady || !usage || !comments || !graphRef.current) return;
    if (graphBuiltRef.current) return;

    graphBuiltRef.current = true;
    const vis = window.vis!;

    nodesRef.current = new vis.DataSet<VisNode>();
    edgesRef.current = new vis.DataSet();

    const nodes = nodesRef.current;
    const edges = edgesRef.current;

    function makeBox(
      id: string,
      label: string,
      color: string,
      link: string | null
    ): VisNode {
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

    nodes.add({
      ...makeBox(post._id, post.title, "#4CAF50", `/posts/${post._id}`),
      widthConstraint: { minimum: 300, maximum: 340 },
      margin: 20,
      font: { color: "#fff", size: 22, bold: true },
      color: {
        background: "#43A047",
        border: "#1B5E20",
        highlight: { background: "#4CAF50", border: "#1B5E20" },
        hover: { background: "#4CAF50", border: "#1B5E20" },
      },
      mass: 6,
    });

    const net = new vis.Network(
      graphRef.current,
      { nodes, edges },
      {}
    );

    networkRef.current = net;

    net.on("click", (params) => {
      if (!params.nodes?.length) return closePopup();
      const nodeId = params.nodes[0];
      if (nodeId.startsWith("comment-")) showCommentPopup(nodeId);
      else closePopup();
    });

    return () => {
      net.destroy();
      networkRef.current = null;
    };
  }, [scriptReady, usage, comments]);

  /* -------------------------------- POPUP ---------------------------------- */

  const [popup, setPopup] = useState<{
    x: number;
    y: number;
    comment: CommentType | null;
  }>({ x: 0, y: 0, comment: null });

  function closePopup() {
    setPopup({ x: 0, y: 0, comment: null });
    popupRef.current = { open: false, nodeId: null };
  }

  function showCommentPopup(nodeId: string) {
    const net = networkRef.current;
    if (!net || !comments) return;

    const cid = nodeId.replace("comment-", "");
    const comment = comments.find((c) => c._id === cid);
    if (!comment) return;

    const pos = net.getPositions([nodeId])[nodeId];
    const canvas = net.canvasToDOM(pos);

    setPopup({ x: canvas.x, y: canvas.y, comment });
    popupRef.current = { open: true, nodeId };
  }

  /* -------------------------------- RENDER --------------------------------- */

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        ref={graphRef}
        style={{
          width: "100%",
          height: "100%",
          opacity: graphVisible ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      />

      {popup.comment && (
        <div
          style={{
            position: "absolute",
            top: popup.y,
            left: popup.x,
            transform: "translate(-50%, -140%)",
            background: "white",
            padding: 14,
            borderRadius: 10,
            zIndex: 999,
          }}
        >
          <strong>{popup.comment.authorName}</strong>
          <MathRenderer html={popup.comment.content} />
        </div>
      )}
    </div>
  );
}
