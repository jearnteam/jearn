"use client";

import { memo, useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * @deprecated
 * @param container
 */

/* --------------------------------------------------
 * 🖼 IMAGE / GIF FULLSCREEN OVERLAY (FRAMED)
 * -------------------------------------------------- */
function openImageOverlay(src: string) {
  if (document.getElementById("image-overlay")) return;

  const isMobile = window.innerWidth < 768;

  const overlay = document.createElement("div");
  overlay.id = "image-overlay";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "999999";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.cursor = "zoom-out";

  // 🔥 mobile = true black fullscreen
  overlay.style.background = isMobile ? "#000" : "rgba(0,0,0,0.65)";
  overlay.style.padding = isMobile ? "0" : "32px";

  // ❌ CLOSE BUTTON (TOP RIGHT)
  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "✕";
  closeBtn.setAttribute("aria-label", "Close image");

  closeBtn.style.position = "absolute";
  closeBtn.style.top = "16px";
  closeBtn.style.left = "16px";
  closeBtn.style.width = "40px";
  closeBtn.style.height = "40px";
  closeBtn.style.color = "white";
  closeBtn.style.fontSize = "24px";
  closeBtn.style.lineHeight = "1";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.display = "flex";
  closeBtn.style.alignItems = "center";
  closeBtn.style.justifyContent = "center";
  closeBtn.style.zIndex = "1000000";

  // mobile-friendly tap size
  closeBtn.style.touchAction = "manipulation";

  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    close();
  });

  overlay.appendChild(closeBtn);

  const frame = document.createElement("div");
  frame.style.width = "100%";
  frame.style.height = "100%";
  frame.style.display = "flex";
  frame.style.alignItems = "center";
  frame.style.justifyContent = "center";
  frame.style.pointerEvents = "none";

  if (isMobile) {
    frame.style.maxWidth = "100vw";
    frame.style.maxHeight = "100vh";
  } else {
    frame.style.maxWidth = "min(92vw, 1200px)";
    frame.style.maxHeight = "min(92vh, 800px)";
  }

  const img = document.createElement("img");
  img.src = src;
  img.draggable = false;

  const isGif = src.endsWith(".gif") || src.includes(".gif?");

  img.style.maxWidth = "100%";
  img.style.maxHeight = "100%";
  img.style.objectFit = "contain";
  img.style.pointerEvents = "auto";
  img.style.cursor = "zoom-out";
  img.style.touchAction = "none"; // 🔥 REQUIRED for drag

  if (isGif || isMobile) {
    img.style.width = "100%";
    img.style.height = "100%";
  }

  // -----------------------------
  // 🖐 DRAG TO CLOSE (MOBILE)
  // -----------------------------
  let startY = 0;
  let currentY = 0;
  let dragging = false;

  const CLOSE_THRESHOLD = 120; // px

  function onTouchStart(e: TouchEvent) {
    dragging = true;
    startY = e.touches[0].clientY;
    img.style.transition = "none";
  }

  function onTouchMove(e: TouchEvent) {
    if (!dragging) return;

    currentY = e.touches[0].clientY - startY;

    img.style.transform = `translateY(${currentY}px)`;

    // fade background as you drag
    const opacity = Math.max(0, 1 - Math.abs(currentY) / 300);
    overlay.style.opacity = String(opacity);
  }

  function onTouchEnd() {
    dragging = false;

    if (Math.abs(currentY) > CLOSE_THRESHOLD) {
      close();
      return;
    }

    // snap back
    img.style.transition = "transform 200ms ease";
    img.style.transform = "translateY(0)";
    overlay.style.opacity = "1";
  }

  if (isMobile) {
    img.addEventListener("touchstart", onTouchStart);
    img.addEventListener("touchmove", onTouchMove);
    img.addEventListener("touchend", onTouchEnd);
  }

  // -----------------------------
  // 🔚 CLOSE HANDLERS
  // -----------------------------
  function close() {
    document.body.style.overflow = "";
    window.removeEventListener("keydown", onKey);
    overlay.remove();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }

  overlay.addEventListener("click", () => {
    if (!isMobile) close();
  });

  img.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!isMobile) close();
  });

  window.addEventListener("keydown", onKey);

  frame.appendChild(img);
  overlay.appendChild(frame);
  document.body.appendChild(overlay);

  document.body.style.overflow = "hidden";
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
    imgEl.style.cursor = "zoom-in";

    imgEl.addEventListener("click", (e) => {
      e.stopPropagation();
      openImageOverlay(imgEl.src);
    });
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
