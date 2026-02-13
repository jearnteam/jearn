export const EMBED_WHITELIST = [
  "youtube.com",
  "youtu.be",
  "open.spotify.com",
  "spotify.com",
  "x.com",
  "twitter.com",
  "jearn.site",
];

export function getHostname(raw: string) {
  try {
    const normalized = raw.startsWith("http") ? raw : "https://" + raw;

    return new URL(normalized).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function isWhitelisted(url: string) {
  const host = getHostname(url);

  return EMBED_WHITELIST.some(
    (domain) => host === domain || host.endsWith("." + domain)
  );
}
