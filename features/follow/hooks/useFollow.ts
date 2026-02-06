import { useEffect, useState, useCallback } from "react";

export function useFollow(targetUserId: string) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ⭐ ここ重要
    if (!targetUserId) {
      setLoading(false); // ← 必ず止める
      return;
    }

    let alive = true;

    (async () => {
      try {
        const res = await fetch(`/api/follow/status/${targetUserId}`, {
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) throw new Error("status fetch failed");

        const data = await res.json();
        if (alive) {
          setFollowing(!!data.following);
        }
      } catch (e) {
        console.error("follow status error", e);
      } finally {
        if (alive) setLoading(false); // ← 絶対ここで止まる
      }
    })();

    return () => {
      alive = false;
    };
  }, [targetUserId]);

  const toggleFollow = useCallback(async () => {
    if (!targetUserId) return;

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
    } catch (e) {
      console.error("toggle follow error", e);
    } finally {
      setLoading(false); // ← ここも必須
    }
  }, [targetUserId]);

  return { following, loading, toggleFollow };
}
