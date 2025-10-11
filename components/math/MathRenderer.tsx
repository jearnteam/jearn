"use client";

import { memo, useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

function MathRendererBase({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ✅ Type the NodeList as HTMLElement so .style exists
    const nodes = container.querySelectorAll<HTMLElement>("span[data-type='math']");

    nodes.forEach((spanEl) => {
      const latex = spanEl.getAttribute("latex") || "";

      // Render KaTeX into a fresh child to avoid React/DOM conflicts
      const mathEl = document.createElement("span");
      try {
        katex.render(latex, mathEl, { throwOnError: false });
      } catch {
        mathEl.textContent = latex;
      }

      spanEl.innerHTML = "";
      spanEl.appendChild(mathEl);

      // Copy with Ctrl/Cmd+C -> put LaTeX on clipboard
      const onCopy = (e: ClipboardEvent) => {
        e.clipboardData?.setData("text/plain", latex);
        e.preventDefault();
      };
      spanEl.addEventListener("copy", onCopy);

      // Double-click to copy instantly with a quick visual flash
      const onDblClick = async () => {
        try {
          await navigator.clipboard.writeText(latex);
          spanEl.style.transition = "background 0.2s ease";
          spanEl.style.background = "#d1fae5"; // light green
          setTimeout(() => {
            spanEl.style.background = "";
          }, 400);
        } catch (err) {
          console.error("Clipboard copy failed:", err);
        }
      };
      spanEl.addEventListener("dblclick", onDblClick);

      // Optional: cleanup if this component unmounts
      // (When html changes, React replaces the whole innerHTML,
      // so old nodes & listeners are dropped automatically.)
      return () => {
        spanEl.removeEventListener("copy", onCopy);
        spanEl.removeEventListener("dblclick", onDblClick);
      };
    });
  }, [html]); // runs only when the post content changes

  return (
    <div
      ref={containerRef}
      className="text-black"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export const MathRenderer = memo(
  MathRendererBase,
  (prev, next) => prev.html === next.html
);
