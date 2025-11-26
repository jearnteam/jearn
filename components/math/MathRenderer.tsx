"use client";

import { memo, useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/* ---------------------------------------------------------- */
/*                         IMAGE PARSER                       */
/* ---------------------------------------------------------- */
function renderImages(container: HTMLElement) {
  const placeholders = container.querySelectorAll(
    "[data-type='image-placeholder']"
  );

  placeholders.forEach((value) => {
    const node = value as HTMLElement;
    const id = node.getAttribute("data-id");
    if (!id) return;

    const wrapper = document.createElement("div");
    wrapper.className =
      "  post-image-wrapper w-full max-h-[400px] my-4 flex justify-center items-center rounded-md";

    const img = document.createElement("img");
    img.src = `/api/images/${id}`; // FINAL correct route
    img.className =
      "max-h-[400px] w-auto object-contain rounded-md opacity-0 transition-opacity duration-300";

    img.onload = () => {
      img.style.opacity = "1";
    };

    img.onerror = () => {
      wrapper.innerHTML =
        "<div class='text-gray-500 dark:text-gray-300 p-4'>Image not available</div>";
    };

    wrapper.appendChild(img);
    node.replaceWith(wrapper);
  });
}

/* ---------------------------------------------------------- */
/*                       MATH RENDERER                        */
/* ---------------------------------------------------------- */
function MathRendererBase({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    /* --------- RENDER MATH ---------- */
    const mathNodes = el.querySelectorAll("span[data-type='math']");
    mathNodes.forEach((span) => {
      const rawLatex = span.getAttribute("latex") || "";
      const cleaned = rawLatex.replace(/[\u200B-\u200D\uFEFF]/g, "");

      const mathEl = document.createElement("span");

      try {
        katex.render(cleaned, mathEl, { throwOnError: false });
      } catch {
        mathEl.textContent = cleaned;
      }

      span.innerHTML = "";
      span.appendChild(mathEl);
    });

    /* --------- RENDER IMAGES LAST ---------- */
    renderImages(el);
  }, [html]);

  return (
    <div
      ref={ref}
      className="math-content whitespace-pre-line break-words"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export const MathRenderer = memo(
  MathRendererBase,
  (prev, next) => prev.html === next.html
);
