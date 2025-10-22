"use client";

import { useState, useEffect } from "react";

interface User {
  _id: string;
  email: string;
  name?: string | null;
  picture?: string | null;
  email_verified?: boolean;
}

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const MAX_RETRIES = 10;
  const RETRY_DELAY = 1000; // 1s

  async function fetchWithRetry(attempt = 1): Promise<void> {
    try {
      const res = await fetch("/api/auth/cf", { credentials: "include" });

      if (!res.ok) {
        // 503 usually means Cloudflare Access not ready yet
        if (res.status === 503 && attempt < MAX_RETRIES) {
          setTimeout(() => fetchWithRetry(attempt + 1), RETRY_DELAY);
          return;
        }

        setUser(null);
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.ok) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      if (attempt < MAX_RETRIES) {
        setTimeout(() => fetchWithRetry(attempt + 1), RETRY_DELAY);
        return;
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWithRetry();
  }, []);

  return { user, loading };
}
