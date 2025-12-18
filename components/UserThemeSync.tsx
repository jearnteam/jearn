"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function UserThemeSync() {
  const { user } = useCurrentUser();
  const { setTheme, theme } = useTheme();

  // 🔒 ensure we sync only once, on first meaningful load
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (!user?.theme) return;

    // ✅ already synced → never touch again
    if (hasSyncedRef.current) return;

    // ✅ do nothing if theme already matches
    if (theme === user.theme) {
      hasSyncedRef.current = true;
      return;
    }

    // ✅ initial hydration sync only
    setTheme(user.theme);
    hasSyncedRef.current = true;
  }, [user?.theme, theme, setTheme]);

  return null;
}
