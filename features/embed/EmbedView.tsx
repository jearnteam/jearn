"use client";

import { NodeViewWrapper } from "@tiptap/react";

function getProvider(url: string) {
  if (url.includes("youtube")) return "YouTube";
  if (url.includes("spotify")) return "Spotify";
  if (url.includes("x.com") || url.includes("twitter")) return "X";
  return "Embed";
}

export default function EmbedView({ node, editor, getPos }: any) {
  const { url } = node.attrs;

  const provider = getProvider(url);

  const removeEmbed = () => {
    const pos = getPos?.();
    if (typeof pos !== "number") return;

    const { state } = editor;
    const tr = state.tr;

    tr.replaceWith(
      pos,
      pos + node.nodeSize,
      state.schema.nodes.paragraph.create({}, state.schema.text(url))
    );

    editor.view.dispatch(tr);
    editor.commands.focus();
  };

  /* ---------------- YOUTUBE ---------------- */
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const videoId =
      url.split("v=")[1]?.split("&")[0] || url.split("youtu.be/")[1];

    const embedUrl = `https://www.youtube.com/embed/${videoId}`;

    return (
      <NodeViewWrapper className="my-4">
        <div className="rounded-xl border border-gray-300 dark:border-gray-700 overflow-hidden bg-white dark:bg-neutral-900">
          {/* HEADER BAR */}
          <div className="flex items-center justify-between px-3 py-2 text-xs bg-gray-100 dark:bg-neutral-800 border-b border-gray-300 dark:border-gray-700">
            <span className="font-medium">{provider}</span>

            <div className="flex gap-3">
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={removeEmbed}
                className="hover:text-red-500"
              >
                ✕
              </button>
            </div>
          </div>

          {/* EMBED */}
          <div className="aspect-video w-full">
            <iframe src={embedUrl} className="w-full h-full" allowFullScreen />
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  /* ---------------- SPOTIFY ---------------- */
  if (url.includes("spotify.com")) {
    const normalized = url.startsWith("http") ? url : "https://" + url;

    // 🔥 Parse URL safely
    const u = new URL(normalized);

    // Remove intl-xx segment if exists
    const cleanedPath = u.pathname.replace(/^\/intl-[^/]+\//, "/");

    // Build proper embed URL
    const embedUrl = `https://open.spotify.com/embed${cleanedPath}`;

    return (
      <NodeViewWrapper className="my-4">
        <div className="rounded-xl border border-gray-300 dark:border-gray-700 overflow-hidden bg-white dark:bg-neutral-900">
          <div className="flex items-center justify-between px-3 py-2 text-xs bg-gray-100 dark:bg-neutral-800 border-b border-gray-300 dark:border-gray-700">
            <span className="font-medium">{provider}</span>

            <div className="flex gap-3">
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={removeEmbed}
                className="hover:text-red-500"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="w-full">
            <iframe
              src={embedUrl}
              width="100%"
              height="152"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  return null;
}
