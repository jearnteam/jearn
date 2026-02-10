import { useEffect, useState, useCallback } from "react";

export function useFollow(targetUserId: string) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!targetUserId) return;

    let alive = true;
    setLoading(true);

    (async () => {
      try {
        const res = await fetch(`/api/follow/status/${targetUserId}`, {
          cache: "no-store",
          credentials: "include",
        });

        const data = await res.json();
        if (alive) setFollowing(!!data.following);
      } catch {
        if (alive) setFollowing(false);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [targetUserId]);

  const toggleFollow = useCallback(async () => {
    if (!targetUserId || following === null) return;

    setLoading(true);
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
        credentials: "include",
      });

      const data = await res.json();

      if (data.action === "followed") setFollowing(true);
      if (data.action === "unfollowed") setFollowing(false);
    } finally {
      setLoading(false);
    }
  }, [targetUserId, following]);

  return { following, loading, toggleFollow };
}
