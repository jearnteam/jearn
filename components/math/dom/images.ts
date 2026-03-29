/* -------------------------------------------------- */
/* 🖼 IMAGE OVERLAY */
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

      window.dispatchEvent(
        new CustomEvent("image:open", {
          detail: { src: imgEl.src },
        })
      );
    });
  });
}
