type ExtractedContent = {
    links: string[];
    mentions: string[];
    tags: string[];
    math: string[];
    images: string[];
  };
  
  export function extractContent(html: string): ExtractedContent {
    const container = document.createElement("div");
    container.innerHTML = html;
  
    const links: string[] = [];
    const mentions: string[] = [];
    const tags: string[] = [];
    const math: string[] = [];
    const images: string[] = [];
  
    /* -------- LINKS -------- */
    container.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      if (href) links.push(href);
    });
  
    /* -------- IMAGES -------- */
    container.querySelectorAll("img").forEach((img) => {
      if (img.src) images.push(img.src);
    });
  
    /* -------- MENTIONS -------- */
    container.querySelectorAll("[data-mention]").forEach((el) => {
      mentions.push(el.getAttribute("data-mention") || el.textContent || "");
    });
  
    /* -------- TAGS -------- */
    container.querySelectorAll("[data-tag]").forEach((el) => {
      tags.push(el.getAttribute("data-tag") || el.textContent || "");
    });
  
    /* -------- MATH (KaTeX / LaTeX) -------- */
    container.querySelectorAll(".math, .katex, [data-math]").forEach((el) => {
      math.push(el.textContent || "");
    });
  
    return { links, mentions, tags, math, images };
  }
  