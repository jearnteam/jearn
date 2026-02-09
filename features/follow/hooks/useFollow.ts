import { useEffect, useState, useCallback, useRef } from "react";

export function useFollow(targetUserId: string) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const initializedRef = useRef(false);

  useEffect(() => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    let alive = true;

    //初回だけ spinner
    if (!initializedRef.current) {
      setLoading(true);
    }

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
        if (alive) setFollowing(false);
      } finally {
        if (alive) {
          setLoading(false);
          initializedRef.current = true;
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [targetUserId]);

  const toggleFollow = useCallback(async () => {
    //未確定状態では操作させない
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
    } catch (e) {
      console.error("toggle follow error", e);
    } finally {
      setLoading(false);
    }
  }, [targetUserId, following]);

  return { following, loading, toggleFollow };
}
