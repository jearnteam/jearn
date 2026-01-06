"use client";

import { memo, useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

function setupMedia(container: HTMLElement) {
  const mediaNodes = container.querySelectorAll("[data-type='media']");

  mediaNodes.forEach((node) => {
    const el = node as HTMLElement;
    const raw = el.dataset.media;
    if (!raw) return;

    const decoded = raw.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    let media: { url: string; kind?: string };

    try {
      media = JSON.parse(decoded);
    } catch {
      console.error("Invalid media JSON:", decoded);
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.style.width = "100%";
    wrapper.style.maxWidth = "100%";
    wrapper.style.margin = "16px auto";
    wrapper.style.display = "block";
    wrapper.style.background = "#111";
    wrapper.style.border = "2px solid red"; // 🔥 DEBUG BORDER
    wrapper.style.height = "225px"; // 🔥 FORCE HEIGHT (16:9)
    wrapper.style.borderRadius = "8px";
    wrapper.style.overflow = "hidden";

    el.replaceWith(wrapper);

    const isVideo =
      media.kind === "video" ||
      media.url.endsWith(".mp4") ||
      media.url.endsWith(".webm");

    if (isVideo) {
      const video = document.createElement("video");
      video.src = media.url;

      video.controls = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";

      video.style.width = "100%";
      video.style.height = "100%";
      video.style.display = "block";
      video.style.background = "black";

      // 🔥 HARD DEBUG
      video.addEventListener("error", () => {
        console.error("VIDEO ERROR", video.error, media.url);
      });

      video.addEventListener("loadedmetadata", () => {
        console.log("VIDEO OK", media.url, video.videoWidth, video.videoHeight);
      });

      wrapper.appendChild(video);
      return;
    }

    // Image fallback
    const img = document.createElement("img");
    img.src = media.url;
    img.style.maxWidth = "100%";
    img.style.maxHeight = "400px";
    img.style.display = "block";
    img.style.margin = "0 auto";
    img.style.borderRadius = "8px";

    wrapper.appendChild(img);
  });
}

function setupLegacyImages(container: HTMLElement) {
  const imgs = container.querySelectorAll("img[data-type='image-placeholder']");

  imgs.forEach((img) => {
    const imgEl = img as HTMLImageElement;
    const src = imgEl.src;
    if (!src) return;

    const isVideo =
      src.endsWith(".mp4") ||
      src.endsWith(".webm") ||
      src.includes(".mp4?") ||
      src.includes(".webm?");

    /* --------------------------------------------------
     * 🎬 LEGACY VIDEO (AUTO ORIENTATION)
     * -------------------------------------------------- */
    if (isVideo) {
      const wrapper = document.createElement("div");

      // Initial safe layout
      wrapper.style.width = "100%";
      wrapper.style.margin = "12px auto";
      wrapper.style.background = "black";
      wrapper.style.borderRadius = "10px";
      wrapper.style.overflow = "hidden";
      wrapper.style.aspectRatio = "16 / 9"; // placeholder

      // Desktop cap only
      if (window.innerWidth >= 768) {
        wrapper.style.maxHeight = "420px";
      }

      const video = document.createElement("video");
      video.src = src;

      video.muted = true;
      video.playsInline = true;
      video.controls = true;
      video.preload = "metadata";

      video.style.width = "100%";
      video.style.height = "100%";
      video.style.display = "block";
      video.style.objectFit = "contain";

      // 🔥 AUTO DETECT ORIENTATION
      video.addEventListener("loadedmetadata", () => {
        const w = video.videoWidth;
        const h = video.videoHeight;

        if (!w || !h) return;

        // Portrait (TikTok / Shorts)
        if (h > w * 1.1) {
          wrapper.style.aspectRatio = "9 / 16";

          if (window.innerWidth >= 768) {
            wrapper.style.maxHeight = "560px";
          }
        }
        // Square (Instagram)
        else if (Math.abs(w - h) < 50) {
          wrapper.style.aspectRatio = "1 / 1";
        }
        // Landscape (default)
        else {
          wrapper.style.aspectRatio = "16 / 9";
        }
      });

      wrapper.appendChild(video);
      imgEl.replaceWith(wrapper);
      return;
    }

    /* --------------------------------------------------
     * 🖼 LEGACY IMAGE
     * -------------------------------------------------- */
    imgEl.loading = "lazy";
    imgEl.decoding = "async";
    imgEl.style.maxWidth = "100%";
    imgEl.style.maxHeight = "400px";
    imgEl.style.display = "block";
    imgEl.style.margin = "0 auto";
    imgEl.style.borderRadius = "8px";
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
    setupMedia(el);
    setupLegacyImages(el);

    return () => {
      document.querySelectorAll(".mention-popup").forEach((p) => p.remove());
    };
  }, [html]);

  return (
    <div
      ref={ref}
      className="math-content break-words"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export const MathRenderer = memo(
  MathRendererBase,
  (prev, next) => prev.html === next.html
);
