// hooks/useCurrentUser.ts
"use client";

import { useState, useEffect } from "react";

let cachedUser: any = null;
let fetchPromise: Promise<any> | null = null;

async function fetchUser() {
  const res = await fetch("/api/user/current", {
    cache: "no-store",
    credentials: "include",
  });

  const data = await res.json();
  return data?.user ?? null;
}

async function getUserOnce() {
  if (cachedUser) return cachedUser;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetchUser()
    .then((u) => {
      cachedUser = u;
      return u;
    })
    .catch((err) => {
      console.error("getUserOnce error:", err);
      cachedUser = null;
      return null;
    });

  return fetchPromise;
}

export function useCurrentUser() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const decorateUser = (u: any) => {
    if (!u) return null;

    const ts = u.avatarUpdatedAt
      ? `?t=${new Date(u.avatarUpdatedAt).getTime()}`
      : "";

    const picture =
      u.avatarUrl && typeof u.avatarUrl === "string"
        ? `${u.avatarUrl}${ts}`
        : "/default-avatar.png";

    return {
      ...u,
      isAdmin: u.isAdmin ?? false,
      picture,
    };
  };

  useEffect(() => {
    let active = true;

    getUserOnce().then((u) => {
      if (!active) return;
      setUser(decorateUser(u));
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const update = async () => {
    const newUser = await fetchUser();
    cachedUser = newUser;
    setUser(decorateUser(newUser));
  };

  return { user, loading, update };
}
