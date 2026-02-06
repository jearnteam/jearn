// lib/avatarUrl.ts

/**
 * Generate cache-safe avatar URL.
 * Appends a version query to bust CDN cache when updated.
 */
export function avatarUrl(
    userId: string,
    updatedAt?: string | Date | null
  ) {
    if (!userId) {
      return "https://cdn.jearn.site/avatars/default.webp";
    }
  
    const ts = updatedAt
      ? `?v=${
          typeof updatedAt === "string"
            ? new Date(updatedAt).getTime()
            : updatedAt.getTime()
        }`
      : "";
  
    return `https://cdn.jearn.site/avatars/${userId}.webp${ts}`;
  }
  