"use client";

import { memo, useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/* ----------------------------------------------------------
 *  AUTO-LOADING R2 IMAGE PLACEHOLDER
 * ---------------------------------------------------------- */
function setupLazyImages(container: HTMLElement) {
  const nodes = container.querySelectorAll("[data-type='image-placeholder']");

  nodes.forEach((node) => {
    const el = node as HTMLElement;
    const id = el.dataset.id!;
    const width = Number(el.dataset.width ?? 0);
    const height = Number(el.dataset.height ?? 0);

    // Calculate preview height but DO NOT render any padding box.
    let previewHeight = height > 0 ? Math.min(height, 400) : 400;

    // Tell PostItem a preview height exists
    el.dispatchEvent(
      new CustomEvent("image-height", {
        detail: { height: previewHeight },
        bubbles: true,
      })
    );

    // Initially empty. No skeleton, no border, no padding.
    el.innerHTML = "";

    // Prepare the box as auto height
    const box = document.createElement("div");
    box.style.width = "100%";
    box.style.overflow = "hidden";
    box.style.display = "block";
    box.className = "lazy-image-box"; // optional
    el.appendChild(box);

    // Build URLs
    const r2Base = `https://cdn.jearn.site/posts/${id}`;
    const trySources = [`${r2Base}.jpg`, `${r2Base}.png`, `${r2Base}.webp`];

    let loaded = false;

    function tryLoad(i: number) {
      if (i >= trySources.length) {
        box.innerHTML = `<div class="text-red-500">Image not found</div>`;
        return;
      }

      const img = new Image();
      img.src = trySources[i];
      img.decoding = "async";

      img.onload = () => {
        if (loaded) return;
        loaded = true;

        // Clean box
        box.innerHTML = "";
        img.style.width = "auto";
        img.style.height = "auto";
        img.style.maxHeight = "400px"; // respected without cropping
        img.style.objectFit = "unset"; // keep natural aspect ratio
        img.style.display = "block"; // remove inline gap
        img.style.borderRadius = "8px";
        img.style.margin = "0 auto";
        img.className = "opacity-0 transition-opacity duration-300";

        box.appendChild(img);

        requestAnimationFrame(() => {
          img.style.opacity = "1";
        });
      };

      img.onerror = () => tryLoad(i + 1);
    }

    tryLoad(0);
  });
}

/* ----------------------------------------------------------
 *  MATH RENDERING
 * ---------------------------------------------------------- */
function renderMath(el: HTMLElement) {
  const nodes = el.querySelectorAll("span[data-type='math']");
  nodes.forEach((span: any) => {
    let latex =
      span.getAttribute("data-latex") ||
      span.getAttribute("latex") ||
      span.textContent ||
      "";

    const cleaned = latex.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();

    const render = document.createElement("span");

    try {
      katex.render(cleaned, render, { throwOnError: false });
    } catch {
      render.textContent = cleaned;
    }

    span.innerHTML = "";
    span.appendChild(render);
  });
}

/* ----------------------------------------------------------
 *  MENTION POPUP
 * ---------------------------------------------------------- */
function setupMentions(el: HTMLElement) {
  let popup: HTMLElement | null = null;

  function destroy() {
    popup?.remove();
    popup = null;
  }

  const mentions = el.querySelectorAll(
    "span[data-mention]"
  ) as NodeListOf<HTMLElement>;

  mentions.forEach((mentionEl) => {
    const uid = mentionEl.dataset.uid || "";
    const userId = mentionEl.dataset.userid || "";

    mentionEl.style.cursor = "pointer";

    mentionEl.addEventListener("click", (e) => {
      e.stopPropagation();
      const target = uid || userId;
      if (target)
        window.location.href = `/profile/${encodeURIComponent(target)}`;
    });

    mentionEl.addEventListener("mouseenter", async () => {
      destroy();

      popup = document.createElement("div");
      popup.className =
        "mention-popup fixed z-[99999] px-3 py-2 rounded-md shadow-lg border " +
        "border-gray-300 dark:border-gray-600 bg-white dark:bg-neutral-900 text-sm w-56";

      popup.innerHTML = `
        <div class="animate-pulse flex items-center gap-3">
          <div class="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
          <div class="flex flex-col gap-1">
            <div class="w-24 h-3 bg-gray-300 dark:bg-gray-700 rounded"></div>
            <div class="w-16 h-3 bg-gray-300 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      `;

      document.body.appendChild(popup);

      const rect = mentionEl.getBoundingClientRect();
      popup.style.top = rect.bottom + 8 + "px";
      popup.style.left = rect.left + "px";

      let user: any = null;
      try {
        const res = await fetch(`/api/user/by-uid/${uid}`);
        const data = await res.json();
        if (res.ok && data.ok) user = data.user;
      } catch {}

      if (!popup) return;

      popup.innerHTML = `
        <div class="flex items-center gap-3">
          <img src="${user?.picture ?? "/default-avatar.png"}"
               class="w-10 h-10 rounded-full object-cover"/>
          <div class="flex flex-col">
            <span class="font-semibold">@${user?.userId ?? userId}</span>
            <span class="text-gray-600 dark:text-gray-300 text-xs">
              ${user?.name ?? "Unknown"}
            </span>
          </div>
        </div>
        ${
          user?.bio
            ? `<div class="mt-2 text-xs text-gray-700 dark:text-gray-300">${user.bio}</div>`
            : ""
        }
      `;
    });

    mentionEl.addEventListener("mouseleave", destroy);
  });
}

/* ----------------------------------------------------------
 *  MAIN RENDERER
 * ---------------------------------------------------------- */
function MathRendererBase({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    renderMath(el);
    setupMentions(el);
    setupLazyImages(el);

    return () => {
      document.querySelectorAll(".mention-popup").forEach((p) => p.remove());
    };
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
