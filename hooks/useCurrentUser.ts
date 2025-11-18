"use client";

import { useState, useEffect, useCallback, useRef } from "react";

//
// -------------------------------------------------------
//  GLOBAL CACHE — shared across ALL components / hooks
// -------------------------------------------------------
let cachedUser: any = null;
let fetchPromise: Promise<any> | null = null;

async function getUserOnce() {
  // Already fetched → return cached version instantly
  if (cachedUser) return cachedUser;

  // If already fetching → return the same promise
  if (fetchPromise) return fetchPromise;

  // First fetch → create a single promise
  fetchPromise = fetch("/api/user/current", {
    cache: "no-store",
    credentials: "include",
  })
    .then(async (res) => {
      const data = await res.json();
      cachedUser = data; // Save globally
      return data;
    })
    .catch((err) => {
      console.error("getUserOnce error:", err);
      cachedUser = null;
      return null;
    });

  return fetchPromise;
}


// -------------------------------------------------------
//  HOOK BEGINS HERE
// -------------------------------------------------------
export function useCurrentUser() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getUserOnce().then((data) => {
      if (!active) return;

      if (!data || !data.user) {
        setUser(null);
      } else {
        const { _id, uid, name, bio, theme, language, hasPicture } = data.user;

        const avatar = hasPicture
          ? `/api/user/avatar/${_id}?v=${Date.now()}`
          : "/default-avatar.png";

        setUser({
          _id,
          uid,
          name,
          bio,
          theme,
          language,
          picture: avatar,
        });
      }

      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  return { user, loading };
}
