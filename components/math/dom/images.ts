/* -------------------------------------------------- */
/* 🖼 IMAGE OVERLAY */
/* -------------------------------------------------- */

export function openImageOverlay(src: string) {
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
    overlay.style.background = isMobile ? "#000" : "rgba(0,0,0,0.65)";
    overlay.style.cursor = "zoom-out";
  
    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "✕";
    closeBtn.style.position = "absolute";
    closeBtn.style.top = "16px";
    closeBtn.style.left = "16px";
    closeBtn.style.color = "white";
    closeBtn.style.fontSize = "24px";
    closeBtn.style.zIndex = "1000000";
  
    function close() {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      overlay.remove();
    }
  
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
  
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      close();
    });
  
    overlay.appendChild(closeBtn);
  
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
  
    window.addEventListener("keydown", onKey);
  }
  
  /* -------------------------------------------------- */
  /* LEGACY IMAGE + VIDEO */
  /* -------------------------------------------------- */
  
  export function setupLegacyImages(container: HTMLElement) {
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
  
      if (isVideo) {
        const wrapper = document.createElement("div");
        wrapper.style.width = "100%";
        wrapper.style.margin = "12px auto";
        wrapper.style.background = "black";
        wrapper.style.borderRadius = "10px";
        wrapper.style.overflow = "hidden";
        wrapper.style.aspectRatio = "16 / 9";
  
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
  
        wrapper.appendChild(video);
        imgEl.replaceWith(wrapper);
        return;
      }
  
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
  