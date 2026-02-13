import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import net from "node:net";

export const runtime = "nodejs";

type OGP = {
  url: string;
  domain: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
};

const cache = new Map<string, { data: OGP; expires: number }>();
const TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

function isPrivateHost(host: string) {
  // block localhost
  if (host === "localhost" || host.endsWith(".local")) return true;

  // block raw IP private ranges (basic)
  const ipType = net.isIP(host);
  if (!ipType) return false;

  // IPv4 private checks
  if (ipType === 4) {
    const parts = host.split(".").map((n) => parseInt(n, 10));
    const [a, b] = parts;

    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // link-local
  }

  // (Optional) Add IPv6 private blocks later
  return false;
}

function normalizeUrl(raw: string) {
  let cleaned = raw.trim();

  // If protocol missing, default to https
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = "https://" + cleaned;
  }

  let url: URL;

  try {
    url = new URL(cleaned);
  } catch {
    return null;
  }

  if (!["http:", "https:"].includes(url.protocol)) return null;
  if (!url.hostname) return null;
  if (isPrivateHost(url.hostname)) return null;

  return url.toString();
}

function pickMeta($: cheerio.CheerioAPI, prop: string, attr = "property") {
  const v =
    $(`meta[${attr}="${prop}"]`).attr("content") ||
    $(`meta[name="${prop}"]`).attr("content") ||
    null;
  return v?.trim() || null;
}

function absUrl(base: string, maybe: string | null) {
  if (!maybe) return null;
  try {
    return new URL(maybe, base).toString();
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const inputUrl = body?.url;
  if (typeof inputUrl !== "string" || !inputUrl.trim()) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const url = normalizeUrl(inputUrl.trim());
  if (!url) {
    return NextResponse.json(
      { error: "Invalid or blocked url" },
      { status: 400 }
    );
  }

  const cached = cache.get(url);
  const now = Date.now();
  if (cached && cached.expires > now) {
    return NextResponse.json(cached.data);
  }

  // timeout
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 7000);

  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "JEARNBot/1.0 (OGP Preview)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Fetch failed (${res.status})` },
        { status: 400 }
      );
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const domain = new URL(url).hostname.replace(/^www\./, "");

    const ogTitle = pickMeta($, "og:title");
    const ogDesc = pickMeta($, "og:description");
    const ogImage = pickMeta($, "og:image");
    const ogSite = pickMeta($, "og:site_name");

    // fallback to <title> / meta description
    const title = ogTitle || $("title").first().text().trim() || null;
    const description = ogDesc || pickMeta($, "description", "name");

    const image = absUrl(url, ogImage);

    const data: OGP = {
      url,
      domain,
      title: title || null,
      description: description || null,
      image,
      siteName: ogSite || null,
    };

    cache.set(url, { data, expires: now + TTL_MS });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: "OGP fetch error" }, { status: 400 });
  } finally {
    clearTimeout(t);
  }
}
