import { useEffect, useState } from "react";

export function useFollowCount(userId?: string) {
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    let alive = true;

    (async () => {
      try {
        const res = await fetch(`/api/follow/count/${userId}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (alive) {
          setFollowers(data.followers ?? 0);
          setFollowing(data.following ?? 0);
        }
      } catch (e) {
        console.error("Failed to fetch follow count", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [userId]);

  return { followers, following, loading };
}
