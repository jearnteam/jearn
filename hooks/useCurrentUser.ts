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

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/cf", {
          credentials: "include",
        });
        const data = await res.json();
        if (data.ok) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Failed to load user", err);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  return { user, loading };
}
