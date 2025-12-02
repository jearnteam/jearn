"use client";

import { useState, useEffect } from "react";

//
// -------------------------------------------------------
//  GLOBAL CACHE — shared across ALL components / hooks
// -------------------------------------------------------
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

//
// -------------------------------------------------------
//  MAIN HOOK
// -------------------------------------------------------
export function useCurrentUser() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getUserOnce().then((u) => {
      if (!active) return;

      if (!u) {
        setUser(null);
      } else {
        setUser({
          ...u,
          isAdmin: u.isAdmin ?? false,
          picture: u.hasPicture
            ? `/api/user/avatar/${u._id}?v=${Date.now()}`
            : "/default-avatar.png",
        });
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  // IMPORTANT: re-fetch user and update global + local state
  const update = async () => {
    const newUser = await fetchUser();
    cachedUser = newUser;

    setUser(
      !newUser
        ? null
        : {
            ...newUser,
            picture: newUser.hasPicture
              ? `/api/user/avatar/${newUser._id}?v=${Date.now()}`
              : "/default-avatar.png",
          }
    );
  };

  return { user, loading, update };
}
