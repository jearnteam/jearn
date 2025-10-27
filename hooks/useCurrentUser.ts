"use client";

import { useState, useEffect } from "react";

interface User {
  bio: string;
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
  const RETRY_DELAY = 1000;

  // 🟢 Fetch user info from /api/auth/cf (CF Access)
  async function fetchWithRetry(attempt = 1): Promise<void> {
    try {
      const res = await fetch("/api/auth/cf", { credentials: "include" });

      if (res.status === 403) {
        console.warn("⚠️ CF Access expired. Redirecting to login...");
        const redirectUrl = encodeURIComponent(window.location.href);
        // 👇 No .env needed — use domain directly
        window.location.href = `https://jearn.cloudflareaccess.com/cdn-cgi/access/login/kioh.jearn.site?redirect_url=${redirectUrl}`;
        return;
      }

      if (!res.ok) {
        if (res.status === 503 && attempt < MAX_RETRIES) {
          setTimeout(() => fetchWithRetry(attempt + 1), RETRY_DELAY);
          return;
        }
        setUser(null);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setUser(data.ok ? data.user : null);
    } catch (err) {
      console.error("❌ useCurrentUser fetch error:", err);
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

  // 📡 Subscribe to SSE updates
  useEffect(() => {
    if (!user?._id) return;

    const userId = user._id; // ✅ Fix TS18047
    let lastPing = Date.now();

    const evtSource = new EventSource(
      `/api/user/subscribe?id=${userId}`,
      { withCredentials: true }
    );

    // ⏳ check every 10s if the connection is still alive
    const pingCheck = setInterval(() => {
      if (Date.now() - lastPing > 40000) {
        console.warn("⚠️ SSE idle too long, reconnecting...");
        evtSource.close();
        reconnect();
      }
    }, 10000);

    evtSource.onmessage = (e) => {
      if (e.data === '{"status":"connected"}') return;
      lastPing = Date.now();
      try {
        const updatedUser = JSON.parse(e.data);
        setUser((prev) => ({ ...prev, ...updatedUser }));
      } catch (err) {
        console.error("❌ Failed to parse SSE message:", err);
      }
    };

    evtSource.onerror = () => {
      console.warn("⚠️ SSE error, reconnecting...");
      evtSource.close();
      reconnect();
    };

    function reconnect() {
      clearInterval(pingCheck);
      setTimeout(() => {
        const newSource = new EventSource(
          `/api/user/subscribe?id=${userId}`,
          { withCredentials: true }
        );

        newSource.onmessage = evtSource.onmessage;
      }, 3000);
    }

    return () => {
      clearInterval(pingCheck);
      evtSource.close();
    };
  }, [user?._id]);

  return { user, loading };
}
