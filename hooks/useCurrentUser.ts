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
  const mountedRef = useRef(true);

  // 🧭 Fetch user info with proper error handling
  const fetchUser = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);

    try {
      const res = await fetch("/api/user/current", {
        credentials: "include",
        cache: "no-store",
      });

      // 🛑 Prevent retry spam for known server errors
      if (!res.ok) {
        if (res.status >= 500) {
          console.warn("⚠️ /api/user/current server error:", res.status);
          throw new Error("ServerError");
        }
        throw new Error("HTTP " + res.status);
      }

      const data = await res.json();
      if (!mountedRef.current) return;
      setUser(data.user ?? null);
      retryRef.current = 0; // reset retry counter
    } catch (err) {
      // 🔁 Silent retry with exponential backoff (max 3)
      const retries = retryRef.current;
      if (retries < 3) {
        const delay = 300 * Math.pow(2, retries);
        retryRef.current++;
        console.warn(`Retrying fetchUser in ${delay}ms...`);
        setTimeout(fetchUser, delay);
      } else {
        console.error("❌ fetchUser failed after 3 retries:", err);
        if (mountedRef.current) setUser(null);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // 🧩 Fetch on authentication state change
  useEffect(() => {
    if (status === "authenticated") {
      fetchUser();
    } else if (status === "unauthenticated") {
      setUser(null);
      setLoading(false);
    }
  }, [status, fetchUser]);

  // ⏱️ Optional polling (e.g., refresh user info every N ms)
  useEffect(() => {
    if (pollInterval > 0 && status === "authenticated") {
      const id = setInterval(fetchUser, pollInterval);
      return () => clearInterval(id);
    }
  }, [pollInterval, status, fetchUser]);

  // 🧹 Clean up on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ✅ Expose refresh method as "update"
  return { user, loading, update: fetchUser };
}
