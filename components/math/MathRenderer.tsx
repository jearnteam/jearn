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
    const imgEl = node as HTMLImageElement;
    const id = imgEl.dataset.id;
    if (!id) return;

    const height = Number(imgEl.dataset.height ?? 0);
    const previewHeight = height > 0 ? Math.min(height, 400) : 400;

    imgEl.dispatchEvent(
      new CustomEvent("image-height", {
        detail: { height: previewHeight },
        bubbles: true,
      })
    );

    // 🔥 Replace <img> with a wrapper <div>
    const wrapper = document.createElement("div");
    wrapper.style.width = "100%";
    wrapper.style.overflow = "hidden";
    wrapper.style.display = "block";

    imgEl.replaceWith(wrapper);

    const r2Base = `https://cdn.jearn.site/posts/${id}`;
    const FAILED = new Set<string>();

    /* ---------------- VIDEO FIRST ---------------- */
    const videoSrcs = [`${r2Base}.mp4`, `${r2Base}.webm`];

    function tryVideo(i: number) {
      if (i >= videoSrcs.length) {
        tryImage(0);
        return;
      }

      const video = document.createElement("video");
      video.src = videoSrcs[i];
      video.controls = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";

      video.style.maxWidth = "100%";
      video.style.maxHeight = "400px";
      video.style.display = "block";
      video.style.margin = "0 auto";
      video.style.borderRadius = "8px";

      video.onloadedmetadata = () => {
        wrapper.innerHTML = "";
        wrapper.appendChild(video);
      };

      video.onerror = () => tryVideo(i + 1);
    }

    /* ---------------- IMAGE FALLBACK ---------------- */
    const imageSrcs = [`${r2Base}.jpg`, `${r2Base}.png`, `${r2Base}.webp`];

    function tryImage(i: number) {
      if (i >= imageSrcs.length) return;

      const src = imageSrcs[i];
      if (FAILED.has(src)) {
        tryImage(i + 1);
        return;
      }

      const img = new Image();
      img.decoding = "async";
      img.src = src;

      img.onload = () => {
        wrapper.innerHTML = "";

        img.style.maxHeight = "400px";
        img.style.display = "block";
        img.style.margin = "0 auto";
        img.style.borderRadius = "8px";
        img.className = "opacity-0 transition-opacity duration-300";

        wrapper.appendChild(img);
        requestAnimationFrame(() => (img.style.opacity = "1"));
      };

      img.onerror = () => {
        FAILED.add(src);
        tryImage(i + 1);
      };
    }

    tryVideo(0);
  });
}

/* ----------------------------------------------------------
 *  MATH RENDERING
 * ---------------------------------------------------------- */
function renderMath(el: HTMLElement) {
  const nodes = el.querySelectorAll("span[data-type='math']");
  nodes.forEach((span) => {
    const el = span as HTMLElement;
    const latex =
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
function styleMentions(el: HTMLElement) {
  const mentions = el.querySelectorAll(
    "span[data-mention='true']"
  ) as NodeListOf<HTMLElement>;

  mentions.forEach((mentionEl) => {
    mentionEl.classList.add(
      "mention",
      "px-1",
      "py-0.5",
      "rounded",
      "bg-blue-100",
      "dark:bg-blue-900",
      "text-blue-700",
      "dark:text-blue-300",
      "font-medium"
    );
  });
}

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
        window.dispatchEvent(
          new CustomEvent("app:navigate", {
            detail: {
              href: `/profile/${encodeURIComponent(target)}`,
            },
          })
        );
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

      let user: {
        userId?: string;
        name?: string;
        bio?: string;
        picture?: string;
      } | null = null;

      try {
        const res = await fetch(`/api/user/by-uid/${uid}`);
        const data = await res.json();
        if (res.ok && data.ok) user = data.user;
      } catch {}

      if (!popup) return;

      popup.innerHTML = ""; // clear skeleton

      const row = document.createElement("div");
      row.className = "flex items-center gap-3";

      // avatar
      const img = document.createElement("img");
      img.className = "w-10 h-10 rounded-full object-cover";
      img.src = user?.picture?.trim() || "/default-avatar.png";

      img.onerror = () => {
        img.onerror = null; // prevent loop
        img.src = "/default-avatar.png";
      };

      // text container
      const text = document.createElement("div");
      text.className = "flex flex-col";

      const handle = document.createElement("span");
      handle.className = "font-semibold";
      handle.textContent = `@${user?.userId ?? userId}`;

      const name = document.createElement("span");
      name.className = "text-gray-600 dark:text-gray-300 text-xs";
      name.textContent = user?.name ?? "Unknown";

      text.appendChild(handle);
      text.appendChild(name);

      row.appendChild(img);
      row.appendChild(text);
      popup.appendChild(row);

      // bio (optional)
      if (user?.bio) {
        const bio = document.createElement("div");
        bio.className = "mt-2 text-xs text-gray-700 dark:text-gray-300";
        bio.textContent = user.bio;
        popup.appendChild(bio);
      }
    });

    mentionEl.addEventListener("mouseleave", destroy);
  });
}

/* ----------------------------------------------------------
 *  TAG HANDLER (SPA / OVERLAY NAVIGATION)
 * ---------------------------------------------------------- */
function setupTags(el: HTMLElement) {
  el.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const tagEl = target.closest("[data-type='tag']") as HTMLElement | null;
      if (!tagEl) return;

      const value = tagEl.dataset.value;
      if (!value) return;

      // 🔥 STOP native anchor navigation BEFORE it fires
      e.preventDefault();
      e.stopImmediatePropagation();

      window.dispatchEvent(
        new CustomEvent("app:navigate", {
          detail: { href: `/tags/${encodeURIComponent(value)}` },
        })
      );
    },
    true // 👈 CAPTURE PHASE (THIS IS THE KEY)
  );
}

/* ----------------------------------------------------------
 *  VIDEO HANDLER
 * ---------------------------------------------------------- */
function setupVideos(container: HTMLElement) {
  const videos = container.querySelectorAll("video");

  videos.forEach((video) => {
    // ✅ required for desktop autoplay
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;

    // ✅ allow user to interact
    video.controls = true;

    // ✅ ensure visible layout
    video.style.maxWidth = "100%";
    video.style.borderRadius = "8px";
    video.style.display = "block";

    // Optional: prevent layout jump
    video.preload = "metadata";

    // Safety: force reload if browser blocked initial load
    video.load();
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
    styleMentions(el);
    setupMentions(el);
    setupTags(el);
    setupLazyImages(el);
    setupVideos(el);

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
