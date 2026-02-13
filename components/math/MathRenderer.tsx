"use client";

import { memo, useEffect, useRef } from "react";
import katex from "katex";
import Prism from "@/lib/prism";
import "katex/dist/katex.min.css";
import { lucide } from "@/lib/lucide-icons";

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

  /* ---------------- Overlay ---------------- */
  const overlay = document.createElement("div");
  overlay.id = "image-overlay";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "999999";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.background = isMobile ? "#000" : "rgba(0,0,0,0.65)";
  overlay.style.cursor = "zoom-out";

  /* ---------------- Close button ---------------- */
  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "✕";
  closeBtn.style.position = "absolute";
  closeBtn.style.top = "16px";
  closeBtn.style.left = "16px";
  closeBtn.style.color = "white";
  closeBtn.style.fontSize = "24px";
  closeBtn.style.zIndex = "1000000";

  closeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    close();
  });

  overlay.appendChild(closeBtn);

  /* ---------------- Frame + Image ---------------- */
  const frame = document.createElement("div");
  frame.style.width = "100%";
  frame.style.height = "100%";
  frame.style.overflow = "hidden";
  frame.style.display = "flex";
  frame.style.alignItems = "center";
  frame.style.justifyContent = "center";

  const img = document.createElement("img");
  img.src = src;
  img.draggable = false;
  img.style.maxWidth = "100%";
  img.style.maxHeight = "100%";
  img.style.objectFit = "contain";
  img.style.userSelect = "none";
  img.style.touchAction = "none";
  img.style.transformOrigin = "0 0";

  frame.appendChild(img);
  overlay.appendChild(frame);
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  /* ---------------- Transform state ---------------- */
  let scale = 1;
  let x = 0;
  let y = 0;

  const MIN_SCALE = 1;
  const MAX_SCALE = 4;

  function applyTransform() {
    img.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }

  /* ==================================================
   * 🖥 DESKTOP — CURSOR ZOOM + PAN
   * ================================================== */
  overlay.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();

      const delta = -e.deltaY * 0.0015;
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale + delta));
      if (next === scale) return;

      const rect = overlay.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      const ratio = next / scale;
      x = cx - (cx - x) * ratio;
      y = cy - (cy - y) * ratio;

      scale = next;
      applyTransform();
    },
    { passive: false }
  );

  let dragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  img.addEventListener("contextmenu", (e) => e.preventDefault());

  img.addEventListener("mousedown", (e) => {
    if (e.button !== 2) return;
    dragging = true;
    dragStartX = e.clientX - x;
    dragStartY = e.clientY - y;
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    x = e.clientX - dragStartX;
    y = e.clientY - dragStartY;
    applyTransform();
  });

  window.addEventListener("mouseup", () => {
    dragging = false;
  });

  if (!isMobile) {
    overlay.addEventListener("click", () => close());
  }

  /* ==================================================
   * 📱 MOBILE — PINCH + PAN + TAP CLOSE
   * ================================================== */
  let mode: "none" | "pinch" | "pan" = "none";

  let lastDist = 0;
  let lastCenterX = 0;
  let lastCenterY = 0;

  let panStartX = 0;
  let panStartY = 0;

  let tapStartX = 0;
  let tapStartY = 0;
  let isTap = false;

  img.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      mode = "pinch";
      isTap = false;

      const [a, b] = e.touches;
      lastDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      lastCenterX = (a.clientX + b.clientX) / 2;
      lastCenterY = (a.clientY + b.clientY) / 2;
      return;
    }

    if (e.touches.length === 1) {
      mode = "pan";
      tapStartX = e.touches[0].clientX;
      tapStartY = e.touches[0].clientY;
      panStartX = tapStartX - x;
      panStartY = tapStartY - y;
      isTap = true;
    }
  });

  img.addEventListener(
    "touchmove",
    (e) => {
      if (mode === "pinch" && e.touches.length === 2) {
        e.preventDefault();

        const [a, b] = e.touches;
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const centerX = (a.clientX + b.clientX) / 2;
        const centerY = (a.clientY + b.clientY) / 2;

        const next = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, scale * (dist / lastDist))
        );

        const ratio = next / scale;
        x = centerX - (centerX - x) * ratio;
        y = centerY - (centerY - y) * ratio;

        scale = next;
        lastDist = dist;
        lastCenterX = centerX;
        lastCenterY = centerY;

        applyTransform();
        return;
      }

      if (mode === "pan" && e.touches.length === 1) {
        const dx = e.touches[0].clientX - tapStartX;
        const dy = e.touches[0].clientY - tapStartY;

        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          isTap = false;
        }

        x = e.touches[0].clientX - panStartX;
        y = e.touches[0].clientY - panStartY;
        applyTransform();
      }
    },
    { passive: false }
  );

  img.addEventListener("touchend", (e) => {
    if (isTap && e.touches.length === 0) {
      e.preventDefault();
      close();
      return;
    }

    if (e.touches.length === 0) {
      mode = "none";
      isTap = false;
    }
  });

  /* ---------------- Close ---------------- */
  function close() {
    document.body.style.overflow = "";
    window.removeEventListener("keydown", onKey);
    overlay.remove();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }

  window.addEventListener("keydown", onKey);
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
    const uniqueId = mentionEl.dataset.uniqueId || "";

    mentionEl.style.cursor = "pointer";

    mentionEl.addEventListener("click", (e) => {
      e.stopPropagation();
      const target = uid || uniqueId;
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
        uniqueId?: string;
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
      handle.textContent = `@${user?.uniqueId ?? uniqueId}`;

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
 *  EMBED RENDERING (POST DISPLAY)
 * ---------------------------------------------------------- */

function renderEmbeds(el: HTMLElement) {
  const embeds = Array.from(
    el.querySelectorAll("div[data-embed='true']")
  ) as HTMLElement[];

  embeds.forEach((embedEl) => {
    if (embedEl.dataset.rendered === "true") return;

    const urlRaw =
      embedEl.getAttribute("data-url") || embedEl.getAttribute("url");
    if (!urlRaw) return;

    // decode &amp; etc so URL() works and youtube params parse correctly
    const decoded = (() => {
      const t = document.createElement("textarea");
      t.innerHTML = urlRaw;
      return t.value;
    })();

    const normalized = decoded.startsWith("http")
      ? decoded
      : "https://" + decoded;

    /* ---------------- YOUTUBE ---------------- */
    if (normalized.includes("youtube.com") || normalized.includes("youtu.be")) {
      let embedUrl = "";

      try {
        const parsed = new URL(normalized);

        if (parsed.hostname.includes("youtu.be")) {
          const id = parsed.pathname.replace("/", "");
          if (id) embedUrl = `https://www.youtube.com/embed/${id}`;
        } else {
          const id = parsed.searchParams.get("v");
          if (id) embedUrl = `https://www.youtube.com/embed/${id}`;
        }
      } catch {}

      if (!embedUrl) return;

      embedEl.dataset.rendered = "true";

      // 🔥 FIXED RATIO BOX
      const wrapper = document.createElement("div");
      wrapper.style.margin = "16px auto";
      wrapper.style.maxWidth = "560px";
      wrapper.style.width = "100%";
      wrapper.style.height = "315px"; // ✅ FIXED HEIGHT
      wrapper.style.position = "relative";
      wrapper.style.borderRadius = "12px";
      wrapper.style.overflow = "hidden";
      wrapper.style.border = "1px solid rgba(120,120,120,0.2)";
      wrapper.style.background = "#000";

      const iframe = document.createElement("iframe");
      iframe.src = embedUrl;
      iframe.style.position = "absolute";
      iframe.style.top = "0";
      iframe.style.left = "0";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.allowFullscreen = true;

      wrapper.appendChild(iframe);

      embedEl.replaceWith(wrapper);
      return;
    }

    /* ---------------- SPOTIFY ---------------- */
    if (normalized.includes("spotify.com")) {
      let embedUrl = "";

      try {
        const parsed = new URL(normalized);

        // 🔥 remove intl-xx segment if exists
        const cleanedPath = parsed.pathname.replace(/^\/intl-[^/]+\//, "/");

        embedUrl = `https://open.spotify.com/embed${cleanedPath}`;
      } catch {
        return;
      }

      embedEl.dataset.rendered = "true";

      const wrapper = document.createElement("div");
      wrapper.style.width = "100%";
      wrapper.style.maxWidth = "560px";
      wrapper.style.margin = "16px auto";
      wrapper.style.borderRadius = "15px";
      wrapper.style.overflow = "hidden";
      wrapper.style.border = "1px solid rgba(120,120,120,0.2)";
      wrapper.style.background = "#111";

      // ✅ Determine height by content type (Spotify 2024 spec)
      if (embedUrl.includes("/track/")) {
        wrapper.style.height = "82px";
      } else if (embedUrl.includes("/episode/")) {
        wrapper.style.height = "152px";
      } else if (
        embedUrl.includes("/album/") ||
        embedUrl.includes("/playlist/")
      ) {
        wrapper.style.height = "380px";
      } else {
        wrapper.style.height = "380px";
      }

      const iframe = document.createElement("iframe");
      iframe.src = embedUrl;
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "0";
      iframe.allow =
        "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
      iframe.loading = "lazy";

      wrapper.appendChild(iframe);
      embedEl.replaceWith(wrapper);
      return;
    }

    /* ---------------- TWITTER / X  ---------------- */
    if (normalized.includes("x.com") || normalized.includes("twitter.com")) {
      const match = normalized.match(/x\.com\/([^/]+)\/status\/(\d+)/);
      if (!match) return;

      const username = match[1];
      const tweetId = match[2];

      embedEl.dataset.rendered = "true";

      const card = document.createElement("div");

      card.style.margin = "16px auto";
      card.style.maxWidth = "560px";
      card.style.width = "100%";
      card.style.borderRadius = "12px";
      card.style.border = "1px solid rgba(120,120,120,0.3)";
      card.style.background = "#111";
      card.style.padding = "16px";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.gap = "8px";
      card.style.minHeight = "120px"; // 🔥 important

      const header = document.createElement("div");
      header.textContent = `@${username}`;
      header.style.fontWeight = "600";
      header.style.fontSize = "14px";
      header.style.color = "#fff";

      const idText = document.createElement("div");
      idText.textContent = `Tweet ID: ${tweetId}`;
      idText.style.fontSize = "12px";
      idText.style.opacity = "0.6";
      idText.style.color = "#ccc";

      const link = document.createElement("a");
      link.href = normalized;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "View on X →";
      link.style.fontSize = "14px";
      link.style.color = "#1d9bf0";
      link.style.textDecoration = "none";

      card.appendChild(header);
      card.appendChild(idText);
      card.appendChild(link);

      embedEl.replaceWith(card);

      return;
    }
  });
}

/* ----------------------------------------------------------
 *  Prism code highlighting
 * ---------------------------------------------------------- */
function renderPrism(el: HTMLElement) {
  const blocks = el.querySelectorAll("pre > code[class*='language-']");

  blocks.forEach((code) => {
    const codeEl = code as HTMLElement;

    // 🔑 Reset to raw text before highlighting
    const text = codeEl.textContent ?? "";
    codeEl.innerHTML = "";
    codeEl.textContent = text;

    Prism.highlightElement(codeEl);
  });
}

function stripEditorUI(el: HTMLElement) {
  el.querySelectorAll("[data-editor-only]").forEach((n) => n.remove());
}

function addCopyButtons(el: HTMLElement) {
  const blocks = el.querySelectorAll("pre > code");

  blocks.forEach((code) => {
    const pre = code.parentElement as HTMLElement | null;
    if (!pre || pre.querySelector("[data-copy-btn]")) return;

    const btn = document.createElement("button");
    btn.setAttribute("data-copy-btn", "true");

    btn.innerHTML = lucide.copy;

    btn.className = `
      absolute top-2 right-2
      h-7 w-7
      flex items-center justify-center
      rounded
      bg-black/60 hover:bg-black/80
      text-white
      transition
    `;

    let timeout: number | null = null;

    btn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const text = code.textContent ?? "";

      try {
        await navigator.clipboard.writeText(text);

        btn.innerHTML = lucide.check;
        btn.classList.add("bg-green-600");

        if (timeout) window.clearTimeout(timeout);

        timeout = window.setTimeout(() => {
          btn.innerHTML = lucide.copy;
          btn.classList.remove("bg-green-600");
        }, 1200);
      } catch {
        btn.innerHTML = lucide.x;
        btn.classList.add("bg-red-600");

        if (timeout) window.clearTimeout(timeout);

        timeout = window.setTimeout(() => {
          btn.innerHTML = lucide.copy;
          btn.classList.remove("bg-red-600");
        }, 1200);
      }
    };

    pre.classList.add("relative", "group");
    pre.appendChild(btn);
  });
}

/* ----------------------------------------------------------
 *  MAIN RENDERER
 * ---------------------------------------------------------- */
function MathRendererBase({
  html,
  measureOnly,
}: {
  html: string;
  measureOnly?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    stripEditorUI(el);

    renderEmbeds(el);

    renderMath(el);
    styleMentions(el);
    setupMentions(el);
    setupTags(el);
    setupLegacyImages(el);
    renderPrism(el);
    addCopyButtons(el);
    // 🔥 NEW: Handle existing twitter blockquotes
    const hasTwitter = el.querySelector(".twitter-tweet");
    if (hasTwitter) {
      function loadTwitter() {
        (window as any).twttr?.widgets?.load(el);
      }

      if (!(window as any).twttr) {
        const script = document.createElement("script");
        script.src = "https://platform.twitter.com/widgets.js";
        script.async = true;
        script.onload = loadTwitter;
        document.body.appendChild(script);
      } else {
        loadTwitter();
      }
    }
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
