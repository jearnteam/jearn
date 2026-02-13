/**
 * Remove zero-width-space
 */
export function removeZWSP(html: string): string {
  return html.replace(/\u200B/g, "");
}

/* -------------------------------------------------------------------------- */
/*                              CHECK CATEGORIES                              */
/* -------------------------------------------------------------------------- */

export function extractTextWithMath(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;

  let text = "";

  function walk(node: Node) {
    if (!node) return;

    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? "";
      return;
    }

    if (node instanceof HTMLElement && node.dataset.type === "math") {
      const latex =
        node.getAttribute("latex") || node.getAttribute("data-latex") || "";
      if (latex) text += latex + " ";
      return;
    }

    node.childNodes.forEach(walk);
  }

  walk(div);

  return text.replace(/\s+/g, " ").trim();
}

export function extractTagsFromHTML(html: string): string[] {
  const div = document.createElement("div");
  div.innerHTML = html;

  const tags = Array.from(div.querySelectorAll("a[data-type='tag']"))
    .map((a) => a.getAttribute("data-value") || "")
    .map((tag) => tag.toLowerCase().replaceAll(/_/g, ""))
    .filter(Boolean);

  return Array.from(new Set(tags)); // unique tags
}

/**
 * media is meaningful
 * math is meaningful
 * text is meaningful
 */
export function hasMeaningfulContent(html: string): boolean {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;

  // 🔥 embeds are meaningful
  if (tmp.querySelector("[data-embed='true']")) return true;

  // media is meaningful
  if (tmp.querySelector("img, video, iframe")) return true;

  // 🔑 math is meaningful
  if (tmp.querySelector("span[data-type='math']")) return true;

  // text is meaningful
  const text = tmp.textContent?.replace(/\s+/g, "").trim() ?? "";
  return text.length > 0;
}
