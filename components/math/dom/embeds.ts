/* ---------------------------------------------------------- */
/*  EMBED RENDERING (POST DISPLAY) */
/* ---------------------------------------------------------- */

export function renderEmbeds(
  el: HTMLElement,
  options?: { openInNewTab?: boolean }
) {
  /* ---------------- LINK CARDS ---------------- */

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
      parsed = new URL(
        rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`
      );
    } catch {
      return;
    }

    cardEl.dataset.rendered = "true";

    /* JEARN POST PREVIEW */

    if (parsed.hostname.endsWith("jearn.site")) {
      const match = parsed.pathname.match(/\/posts\/([a-f0-9]{24})/);
      if (!match) return;

      const postId = match[1];

      const wrapper = document.createElement("div");
      wrapper.className =
        "my-4 rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-lg transition cursor-pointer overflow-hidden";

      wrapper.innerHTML = `
        <div class="p-4 animate-pulse space-y-3">
          <div class="h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded"></div>
          <div class="h-6 w-3/4 bg-gray-300 dark:bg-gray-700 rounded"></div>
          <div class="h-4 w-full bg-gray-300 dark:bg-gray-700 rounded"></div>
        </div>
      `;

      cardEl.replaceWith(wrapper);

      fetch(`/api/ogp/post/${postId}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.ok) throw new Error();

          const post = data.data;

          wrapper.innerHTML = `
      ${
        post.image
          ? `<div class="w-full h-52 bg-black overflow-hidden">
               <img src="${post.image}" class="w-full h-full object-cover"/>
             </div>`
          : ""
      }

      <div class="p-4 space-y-2">
        <div class="text-xs opacity-60">JEARN Post</div>
        <div class="font-semibold text-lg">
          ${post.title ?? "Untitled"}
        </div>
        ${
          post.description
            ? `<div class="text-sm opacity-80">${post.description}</div>`
            : ""
        }
      </div>
    `;

          /* 🔹 INTERNAL NAVIGATION */

          wrapper.onclick = () => {
            const href = `/posts/${postId}`;

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
        });

      return;
    }

    /* ---------------- EXTERNAL LINK PREVIEW ---------------- */

    const wrapper = document.createElement("div");

    wrapper.className =
      "my-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md transition cursor-pointer overflow-hidden";

    wrapper.innerHTML = `
  <div class="p-4 text-sm opacity-70">
    Loading preview...
  </div>
`;

    cardEl.replaceWith(wrapper);

    fetch("/api/ogp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: parsed.href }),
    })
      .then((res) => res.json())
      .then((data) => {
        const title = data.title || parsed.hostname;
        const description = data.description || "";
        const image = data.image || null;
        const siteName = (data.siteName || parsed.hostname).toUpperCase();

        wrapper.innerHTML = `
      <div class="flex items-center gap-4 p-4">
        
        ${
          image
            ? `<div class="w-20 h-20 flex-shrink-0 overflow-hidden rounded-md bg-black">
                 <img src="${image}" class="w-full h-full object-cover"/>
               </div>`
            : `<div class="w-20 h-20 flex-shrink-0 rounded-md bg-gray-200 dark:bg-gray-800"></div>`
        }

        <div class="flex-1 min-w-0">
          <div class="text-xs uppercase tracking-wide opacity-60 mb-1">
            ${siteName} ↗
          </div>

          <div class="font-semibold text-sm leading-snug line-clamp-2">
            ${title}
          </div>

          ${
            description
              ? `<div class="text-xs opacity-70 mt-1 line-clamp-2">
                   ${description}
                 </div>`
              : ""
          }
        </div>

      </div>
    `;
      })
      .catch(() => {
        wrapper.innerHTML = `
      <div class="p-4">
        <div class="font-semibold break-words">${parsed.hostname}</div>
        <div class="text-sm opacity-70 break-words">${parsed.href}</div>
      </div>
    `;
      });

    wrapper.onclick = () => {
      if (options?.openInNewTab) {
        window.open(parsed.href, "_blank", "noopener,noreferrer");
      } else {
        window.open(parsed.href, "_blank");
      }
    };

    cardEl.replaceWith(wrapper);
  });

  /* ---------------- NORMAL EMBEDS ---------------- */

  const embeds = Array.from(
    el.querySelectorAll("div[data-embed='true']")
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

    /* ---------------- YOUTUBE ---------------- */

    if (normalized.includes("youtube.com") || normalized.includes("youtu.be")) {
      let videoId = "";

      try {
        const parsed = new URL(normalized);

        if (parsed.hostname.includes("youtu.be")) {
          videoId = parsed.pathname.replace("/", "");
        } else {
          videoId = parsed.searchParams.get("v") || "";
        }
      } catch {}

      if (!videoId) return;

      embedEl.dataset.rendered = "true";

      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";
      wrapper.style.width = "100%";
      wrapper.style.maxWidth = "720px";
      wrapper.style.margin = "16px auto";
      wrapper.style.aspectRatio = "16 / 9";
      wrapper.style.borderRadius = "12px";
      wrapper.style.overflow = "hidden";
      wrapper.style.background = "#000";
      wrapper.style.cursor = "pointer";

      const thumbnail = document.createElement("img");
      thumbnail.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      thumbnail.style.position = "absolute";
      thumbnail.style.top = "0";
      thumbnail.style.left = "0";
      thumbnail.style.width = "100%";
      thumbnail.style.height = "100%";
      thumbnail.style.objectFit = "cover";

      const playButton = document.createElement("div");
      playButton.style.position = "absolute";
      playButton.style.top = "50%";
      playButton.style.left = "50%";
      playButton.style.transform = "translate(-50%, -50%)";
      playButton.style.width = "72px";
      playButton.style.height = "50px";
      playButton.style.background = "#FF0000";
      playButton.style.borderRadius = "14px";
      playButton.style.display = "flex";
      playButton.style.alignItems = "center";
      playButton.style.justifyContent = "center";
      playButton.style.boxShadow = "0 6px 20px rgba(0,0,0,0.4)";
      playButton.style.transition = "transform 0.2s ease, background 0.2s ease";

      /* white triangle */
      const triangle = document.createElement("div");
      triangle.style.width = "0";
      triangle.style.height = "0";
      triangle.style.borderLeft = "18px solid white";
      triangle.style.borderTop = "12px solid transparent";
      triangle.style.borderBottom = "12px solid transparent";
      triangle.style.marginLeft = "4px";

      playButton.appendChild(triangle);

      /* hover effect */
      wrapper.onmouseenter = () => {
        playButton.style.transform = "translate(-50%, -50%) scale(1.1)";
        playButton.style.background = "#e60000";
      };
      wrapper.onmouseleave = () => {
        playButton.style.transform = "translate(-50%, -50%) scale(1)";
        playButton.style.background = "#FF0000";
      };

      wrapper.appendChild(thumbnail);
      wrapper.appendChild(playButton);

      wrapper.onclick = () => {
        const iframe = document.createElement("iframe");

        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1`;

        iframe.allowFullscreen = true;
        iframe.loading = "lazy";

        // 🔥 IMPORTANT
        iframe.allow = "autoplay; encrypted-media; picture-in-picture";

        iframe.style.position = "absolute";
        iframe.style.inset = "0";
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "0";

        wrapper.innerHTML = "";
        wrapper.appendChild(iframe);
      };

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
