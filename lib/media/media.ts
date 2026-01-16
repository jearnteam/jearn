// lib/media/media.ts
export function extractPostImageKeys(
  content: string,
  cdnBase = "https://cdn.jearn.site"
): string[] {
  if (!content) return [];

  const regex = new RegExp(
    `${cdnBase.replace(/\./g, "\\.")}/posts/[^\\s"'<>]+`,
    "g"
  );

  const matches = content.match(regex) ?? [];

  return [
    ...new Set(
      matches.map((url) =>
        new URL(url).pathname.replace(/^\/+/, "")
      )
    ),
  ];
}
