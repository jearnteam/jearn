import { useEffect, useState } from "react";

export function useFollow(targetUserId: string) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  // 初期状態を取得
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/follow/status/${targetUserId}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (alive) setFollowing(!!data.following);
      } catch (e) {
        console.error("Failed to fetch follow status:", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [targetUserId]);

  // フォロー / アンフォロー
  async function toggleFollow() {
    if (loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
        credentials: "include", // Cookie を送る
      });
      const data = await res.json();
      if (data.ok) {
        setFollowing(data.action === "followed");
      } else {
        console.error("Follow API returned not ok:", data);
      }
    } catch (e) {
      console.error("Follow API error:", e);
    } finally {
      setLoading(false);
    }
  }

  return { following, loading, toggleFollow };
}
