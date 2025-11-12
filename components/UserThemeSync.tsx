//@/components/UserThemeSync.tsx
"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function UserThemeSync() {
  const { user } = useCurrentUser();
  const { setTheme } = useTheme();
  const hasSyncedRef = useRef(false); // ✅ Prevent re-syncing every render

  useEffect(() => {
    if (!hasSyncedRef.current && user?.theme) {
      setTheme(user.theme);
      hasSyncedRef.current = true;
    }
  }, [user, setTheme]);

  return null;
}