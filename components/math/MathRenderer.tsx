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
      "post-image-wrapper w-full max-h-[400px] my-4 flex justify-center items-center rounded-md";

    const img = document.createElement("img");
    img.src = `/api/images/${id}`;
    img.className =
      "max-h-[400px] w-auto object-contain rounded-md opacity-0 transition-opacity duration-300";

    img.onload = () => (img.style.opacity = "1");
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
    document.querySelectorAll(".mention-popup").forEach((p) => p.remove());

    const el = ref.current;
    if (!el) return;

    /* ============================
     * MATH RENDERING
     * ============================ */
    const mathNodes = el.querySelectorAll("span[data-type='math']");

    mathNodes.forEach((span: any) => {
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

      span.addEventListener("dblclick", async (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        await navigator.clipboard.writeText(cleaned);
        span.style.transition = "background 0.25s ease";
        span.style.background = "#c7d2fe";
        setTimeout(() => (span.style.background = ""), 450);
      });
    });

    /* ============================
     * MENTION POPUP WITH SKELETON
     * ============================ */

    let popup: HTMLElement | null = null;

    const destroyPopup = () => {
      popup?.remove();
      popup = null;
    };

    const mentions = el.querySelectorAll(
      "span[data-mention]"
    ) as NodeListOf<HTMLElement>;

    mentions.forEach((mentionEl) => {
      const userId = mentionEl.dataset.userid || "";
      const uid = mentionEl.dataset.uid || "";

      mentionEl.style.cursor = "pointer";
      mentionEl.style.display = "inline-block";

      /* CLICK → profile page */
      mentionEl.addEventListener("click", (e) => {
        e.stopPropagation();
        const target = uid || userId;
        if (target) window.location.href = `/profile/${encodeURIComponent(target)}`;
      });

      /* MOUSE ENTER → open popup immediately with skeleton */
      mentionEl.addEventListener("mouseenter", async () => {
        destroyPopup();

        popup = document.createElement("div");
        popup.className =
          "mention-popup fixed z-[99999] px-3 py-2 rounded-md shadow-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-neutral-900 text-sm w-56";

        // skeleton first
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

        /* Fetch user AFTER skeleton renders */
        let user: any = null;
        try {
          const res = await fetch(`/api/user/by-uid/${uid}`);
          const data = await res.json();
          if (res.ok && data.ok) user = data.user;
        } catch {}

        if (!popup) return; // user moved away

        // fill real user data
        popup.innerHTML = `
          <div class="flex items-center gap-3">
            <img src="${user?.picture ?? "/default-avatar.png"}"
              class="w-10 h-10 rounded-full object-cover"/>
            <div class="flex flex-col">
              <span class="font-semibold">@${user?.userId ?? userId}</span>
              <span class="text-gray-600 dark:text-gray-300 text-xs">${user?.name ?? "Unknown"}</span>
            </div>
          </div>
          ${user?.bio ? `<div class="mt-2 text-xs text-gray-700 dark:text-gray-300">${user.bio}</div>` : ""}
        `;
      });

      /* MOUSE LEAVE → destroy popup immediately */
      mentionEl.addEventListener("mouseleave", () => destroyPopup());
    });

    return () => destroyPopup();
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
