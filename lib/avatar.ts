const CDN = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

/**
 * @deprecated
 * @param param0 
 * @returns 
 */
export function resolveAvatar({
  avatar,
  userId,
  avatarUpdatedAt,
}: {
  avatar?: string | null;
  userId?: string | null;
  avatarUpdatedAt?: string | number | Date | null;
}) {
  // ① API already sent full URL
  if (avatar) return avatar;

  // ② CDN available → build URL
  if (CDN && userId && avatarUpdatedAt) {
    return `${CDN}/avatars/${userId}.webp?t=${new Date(
      avatarUpdatedAt
    ).getTime()}`;
  }

  // ③ FINAL fallback
  return "/default-avatar.png";
}
