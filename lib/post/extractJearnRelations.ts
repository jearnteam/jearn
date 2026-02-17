export type JearnRelation = {
  type: "post" | "user" | "question";
  id: string;
};

function extractPostIdFromUrl(raw: string): string | null {
  try {
    const cleaned = raw.replace(/\u200B/g, "").trim();

    const url = new URL(
      cleaned.startsWith("http") ? cleaned : `https://${cleaned}`
    );

    if (!url.hostname.endsWith("jearn.site")) return null;

    const match = url.pathname.match(/\/posts\/([a-f0-9]{24})/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export function extractJearnReferences(html: string): string[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const ids = new Set<string>();

  /* ---------- 1️⃣ Normal hyperlinks ---------- */
  const links = Array.from(doc.querySelectorAll("a[href]"));

  for (const a of links) {
    const href = a.getAttribute("href");
    if (!href) continue;

    const id = extractPostIdFromUrl(href);
    if (id) ids.add(id);
  }

  /* ---------- 2️⃣ LinkCard blocks ---------- */
  const cards = Array.from(doc.querySelectorAll("[data-link-card][data-url]"));

  for (const el of cards) {
    const url = el.getAttribute("data-url");
    if (!url) continue;

    const id = extractPostIdFromUrl(url);
    if (id) ids.add(id);
  }

  return Array.from(ids);
}
