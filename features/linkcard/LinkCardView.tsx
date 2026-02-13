"use client";

import { NodeViewWrapper } from "@tiptap/react";
import { useEffect, useMemo, useRef } from "react";

function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export default function LinkCardView(props: any) {
  const { node, editor, getPos, updateAttributes } = props;
  const { url, title, description, image, siteName, loading, error } =
    node.attrs;

  const startedRef = useRef(false);

  const safeDomain = useMemo(
    () => node.attrs.domain || domainOf(url),
    [url, node.attrs.domain]
  );

  /* ---------------- FETCH OGP ---------------- */
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!loading || !url) return;

    const run = async () => {
      try {
        const res = await fetch("/api/ogp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        const data = await res.json();

        if (!res.ok) {
          updateAttributes({
            loading: false,
            error: data?.error || "Failed to load preview",
          });
          return;
        }

        updateAttributes({
          loading: false,
          error: null,
          title: data.title ?? null,
          description: data.description ?? null,
          image: data.image ?? null,
          siteName: data.siteName ?? null,
          domain: data.domain ?? safeDomain,
        });
      } catch {
        updateAttributes({ loading: false, error: "Network error" });
      }
    };

    run();
  }, [url, loading, updateAttributes, safeDomain]);

  /* ---------------- OPEN LINK ---------------- */
  const open = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  /* ---------------- DELETE CARD ---------------- */
  const removeCard = () => {
    const pos = getPos?.();
    if (typeof pos !== "number") return;

    const { state } = editor;
    const tr = state.tr;

    tr.replaceWith(
      pos,
      pos + node.nodeSize,
      state.schema.nodes.paragraph.create(
        {},
        state.schema.text(url)
      )
    );

    editor.view.dispatch(tr);
    editor.commands.focus();
  };

  /* ---------------- COPY LINK ---------------- */
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {}
  };

  return (
    <NodeViewWrapper className="my-2">
      <div
        className="
          w-full rounded-xl border
          border-gray-300 dark:border-gray-700
          bg-white dark:bg-neutral-900
          shadow-sm hover:shadow-md transition
          overflow-hidden relative group
        "
      >
        {/* ACTION BUTTONS */}
        <div className="absolute top-2 right-2 flex gap-2 z-10">
          {/* COPY */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              copyLink();
            }}
            className="
              w-7 h-7 flex items-center justify-center
              rounded-full text-xs
              bg-black/60 text-white
              hover:bg-gray-700 transition
            "
          >
            ⧉
          </button>

          {/* DELETE */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              removeCard();
            }}
            className="
              w-7 h-7 flex items-center justify-center
              rounded-full text-xs
              bg-black/70 text-white
              hover:bg-red-500 transition
            "
          >
            ✕
          </button>
        </div>

        {/* CLICKABLE BODY */}
        <div
          role="button"
          onClick={open}
          className="cursor-pointer flex items-stretch gap-4"
        >
          {/* IMAGE */}
          {image && (
            <div className="w-32 shrink-0 flex items-center justify-center">
              <img
                src={image}
                alt=""
                className="max-h-24 w-auto object-contain"
                loading="lazy"
              />
            </div>
          )}

          {/* TEXT */}
          <div className="p-4 flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wide opacity-60 mb-1">
              {siteName || safeDomain}
              <span className="ml-1">↗</span>
            </div>

            {loading ? (
              <div className="text-sm opacity-80">
                Loading preview…
              </div>
            ) : error ? (
              <>
                <div className="text-base font-semibold break-words">
                  {safeDomain}
                </div>
                <div className="text-xs text-red-500 mt-1">
                  {error}
                </div>
              </>
            ) : (
              <>
                <div className="text-base font-semibold break-words line-clamp-2">
                  {title || safeDomain}
                </div>

                {description && (
                  <div className="text-sm opacity-80 mt-1 line-clamp-2">
                    {description}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
