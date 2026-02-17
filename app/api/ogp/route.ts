// app/api/ogp/route.ts

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
const TTL_MS = 1000 * 60 * 60 * 6;

/* ================= PRIVATE HOST BLOCK ================= */

function isPrivateHost(host: string) {
  if (host === "localhost" || host.endsWith(".local")) return true;

  const ipType = net.isIP(host);
  if (!ipType) return false;

  if (ipType === 4) {
    const parts = host.split(".").map((n) => parseInt(n, 10));
    const [a, b] = parts;

    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }

  return false;
}

/* ================= URL NORMALIZATION ================= */

function normalizeUrl(raw: string) {
  let cleaned = raw.trim();

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

/* ================= CORE HANDLER ================= */

async function handleOGP(inputUrl: string) {
  const url = normalizeUrl(inputUrl);
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

    const pickMeta = (prop: string, attr = "property") =>
      $(`meta[${attr}="${prop}"]`).attr("content") ||
      $(`meta[name="${prop}"]`).attr("content") ||
      null;

    const absUrl = (maybe: string | null) => {
      if (!maybe) return null;
      try {
        return new URL(maybe, url).toString();
      } catch {
        return null;
      }
    };

    const title =
      pickMeta("og:title") ||
      $("title").first().text().trim() ||
      null;

    const description =
      pickMeta("og:description") ||
      pickMeta("description", "name");

    const image = absUrl(pickMeta("og:image"));

    const data: OGP = {
      url,
      domain,
      title: title || null,
      description: description || null,
      image,
      siteName: pickMeta("og:site_name"),
    };

    cache.set(url, { data, expires: now + TTL_MS });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "OGP fetch error" },
      { status: 400 }
    );
  } finally {
    clearTimeout(t);
  }
}

/* ================= GET ================= */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const inputUrl = searchParams.get("url");

  if (!inputUrl) {
    return NextResponse.json(
      { error: "Missing url" },
      { status: 400 }
    );
  }

  return handleOGP(inputUrl);
}

/* ================= POST ================= */

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const inputUrl = body?.url;

  if (!inputUrl) {
    return NextResponse.json(
      { error: "Missing url" },
      { status: 400 }
    );
  }

  return handleOGP(inputUrl);
}
