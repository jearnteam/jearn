/* ---------------------------------------------------------- */
/*  EMBED RENDERING (POST DISPLAY) */
/* ---------------------------------------------------------- */

export function renderEmbeds(
  el: HTMLElement,
  options?: { openInNewTab?: boolean }
) {
  const embeds = Array.from(
    el.querySelectorAll("div[data-embed='true'], div[data-link-card='true']")
  ) as HTMLElement[];

  embeds.forEach((embedEl) => {
    if (embedEl.dataset.rendered === "true") return;

    const urlRaw =
      embedEl.getAttribute("data-url") || embedEl.getAttribute("url");
    if (!urlRaw) return;

    const decoded = (() => {
      const t = document.createElement("textarea");
      t.innerHTML = urlRaw;
      return t.value;
    })();

    const normalized = decoded.startsWith("http")
      ? decoded
      : "https://" + decoded;

    /* ---------------- JEARN LINK CARD ---------------- */

    const linkCards = Array.from(
      el.querySelectorAll("div[data-link-card='true']")
    ) as HTMLElement[];

    linkCards.forEach((cardEl) => {
      if (cardEl.dataset.rendered === "true") return;

      const rawUrl =
        cardEl.getAttribute("data-url") || cardEl.getAttribute("url");
      if (!rawUrl) return;

      let parsed: URL;
      try {
        parsed = new URL(rawUrl);
      } catch {
        return;
      }

      // Detect JEARN domain
      if (!parsed.hostname.endsWith("jearn.site")) return;

      // Detect /posts/:id
      const match = parsed.pathname.match(/\/posts\/([a-f0-9]{24})/);
      if (!match) return;

      const postId = match[1];

      cardEl.dataset.rendered = "true";

      const wrapper = document.createElement("div");
      wrapper.className =
        "my-4 rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden";

      wrapper.innerHTML = `
    <div class="p-4 animate-pulse space-y-3">
      <div class="h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded"></div>
      <div class="h-6 w-3/4 bg-gray-300 dark:bg-gray-700 rounded"></div>
      <div class="h-4 w-full bg-gray-300 dark:bg-gray-700 rounded"></div>
      <div class="h-4 w-1/2 bg-gray-300 dark:bg-gray-700 rounded"></div>
    </div>
  `;

      cardEl.replaceWith(wrapper);

      fetch(`/api/ogp/post/${postId}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.ok) throw new Error();

          const post = data.data;

          const createdAt = post.createdAt
            ? new Date(post.createdAt).toLocaleDateString()
            : "";

          wrapper.innerHTML = `
        ${
          post.image
            ? `<div class="w-full h-52 bg-black overflow-hidden">
                 <img 
                   src="${post.image}" 
                   class="w-full h-full object-cover transition-transform duration-300 hover:scale-105" 
                 />
               </div>`
            : ""
        }

        <div class="p-4 space-y-3">
          <div class="flex items-center justify-between text-xs opacity-60">
            <span>JEARN Post</span>
            <span>${createdAt}</span>
          </div>

          <div class="font-semibold text-lg leading-snug line-clamp-2">
            ${post.title ?? "Untitled"}
          </div>

          ${
            post.description
              ? `<div class="text-sm opacity-80 line-clamp-3">
                   ${post.description}
                 </div>`
              : ""
          }

          <div class="flex items-center justify-between text-xs opacity-60 pt-1">
            <span>by ${post.authorName}</span>
            <span>${post.referenceCount} references</span>
          </div>
        </div>
      `;

      wrapper.onclick = () => {
        const href = `/posts/${post.id}`;
      
        if (options?.openInNewTab) {
          window.open(href, "_blank", "noopener,noreferrer");
        } else {
          window.dispatchEvent(
            new CustomEvent("app:navigate", {
              detail: { href },
            })
          );
        }
      };
      
        })
        .catch(() => {
          wrapper.innerHTML = `
        <div class="p-4">
          <div class="font-semibold break-words">
            ${rawUrl}
          </div>
        </div>
      `;
        });
    });

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

      const wrapper = document.createElement("div");
      wrapper.style.margin = "16px auto";
      wrapper.style.maxWidth = "560px";
      wrapper.style.width = "100%";
      wrapper.style.height = "315px";
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

    /* ---------------- TWITTER / X ---------------- */

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
      card.style.minHeight = "120px";

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

/* ---------------------------------------------------------- */
/* Twitter Script Loader */
/* ---------------------------------------------------------- */

export function loadTwitterWidgets(el: HTMLElement) {
  const hasTwitter = el.querySelector(".twitter-tweet");
  if (!hasTwitter) return;

  function load() {
    (window as any).twttr?.widgets?.load(el);
  }

  if (!(window as any).twttr) {
    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.onload = load;
    document.body.appendChild(script);
  } else {
    load();
  }
}
