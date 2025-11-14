"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface User {
  _id: string;
  uid: string | null;
  name?: string | null;
  bio?: string | null;
  theme?: string | null;
  language?: string | null;
  picture?: string | null;
  hasPicture?: boolean;
}

export function useCurrentUser(pollInterval = 0) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const mounted = useRef(true);

  const fetchUser = useCallback(async () => {
    if (!mounted.current) return;

    try {
      const res = await fetch("/api/user/current", {
        cache: "no-store",
        credentials: "include",
      });

      const type = res.headers.get("content-type") || "";
      if (!res.ok || !type.includes("application/json")) {
        console.warn("⚠️ Bad current user response:", res.status);
        setUser(null);
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (!data.user) {
        setUser(null);
        setLoading(false);
        return;
      }

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
    } catch (err) {
      console.error("useCurrentUser error:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser(); // 🔥 RUN IMMEDIATELY
  }, []);

  useEffect(() => {
    if (pollInterval > 0) {
      const id = setInterval(fetchUser, pollInterval);
      return () => clearInterval(id);
    }
  }, [pollInterval]);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  return { user, loading, update: fetchUser };
}
