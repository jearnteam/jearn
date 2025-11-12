// hooks/useCurrentUser.ts
"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useRef } from "react";

interface User {
  uid?: string;
  name?: string | null;
  email?: string | null;
  bio?: string | null;
  picture?: string | null;
  role?: string;
  theme?: string | null;
  language?: string | null;
}

export function useCurrentUser(pollInterval = 0) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const retryRef = useRef(0);

  // 🧭 Fetch user info
  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/current", { credentials: "include" });
      if (!res.ok) throw new Error("HTTP " + res.status);

      const data = await res.json();
      setUser(data.user ?? null);
      retryRef.current = 0;
    } catch (err) {
      // 🔁 Silent retry with exponential backoff, max 3 retries
      if (retryRef.current < 3) {
        const delay = 300 * Math.pow(2, retryRef.current);
        retryRef.current++;
        setTimeout(fetchUser, delay);
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // 🧩 Run on auth state change
  useEffect(() => {
    if (status === "authenticated") {
      fetchUser();
    } else if (status === "unauthenticated") {
      setUser(null);
      setLoading(false);
    }
  }, [status, fetchUser]);

  // ⏱️ Optional polling
  useEffect(() => {
    if (pollInterval > 0 && status === "authenticated") {
      const id = setInterval(fetchUser, pollInterval);
      return () => clearInterval(id);
    }
  }, [pollInterval, status, fetchUser]);

  // ✅ Expose refresh function as "update"
  return { user, loading, update: fetchUser };
}
