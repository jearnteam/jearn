"use client";

import { memo, useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * ✅ MathRenderer
 * - Renders math spans created by the Tiptap MathExtension.
 * - Preserves user line breaks and spacing (`white-space: pre-line`).
 * - Includes copy/dblclick clipboard logic.
 */
function MathRendererBase({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const nodes = container.querySelectorAll<HTMLElement>("span[data-type='math']");

    nodes.forEach((spanEl) => {
      const rawLatex = spanEl.getAttribute("latex") || "";
      const latex = rawLatex.replace(/[\u200B-\u200D\uFEFF]/g, "");

      const mathEl = document.createElement("span");

      try {
        katex.render(latex, mathEl, { throwOnError: false, strict: "warn" });
      } catch (err) {
        console.warn("❌ KaTeX render failed, fallback:", err);
        mathEl.textContent = latex;
      }

      spanEl.innerHTML = "";
      spanEl.appendChild(mathEl);

      const onCopy = (e: ClipboardEvent) => {
        e.clipboardData?.setData("text/plain", latex);
        e.preventDefault();
      };

      const onDblClick = async () => {
        try {
          await navigator.clipboard.writeText(latex);
          spanEl.style.transition = "background 0.2s ease";
          spanEl.style.background = "#d1fae5";
          setTimeout(() => (spanEl.style.background = ""), 400);
        } catch (err) {
          console.error("Clipboard copy failed:", err);
        }
      };

      spanEl.addEventListener("copy", onCopy);
      spanEl.addEventListener("dblclick", onDblClick);

      return () => {
        spanEl.removeEventListener("copy", onCopy);
        spanEl.removeEventListener("dblclick", onDblClick);
      };
    });
  }, [html]);

  return (
    <div
      ref={containerRef}
      className="
        math-content 
        whitespace-pre-line 
        break-words
        text-gray-900 dark:text-gray-100
        transition-colors duration-300
      "
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export const MathRenderer = memo(
  MathRendererBase,
  (prev, next) => prev.html === next.html
);
