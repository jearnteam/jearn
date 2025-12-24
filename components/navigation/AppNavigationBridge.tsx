"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AppNavigationBridge() {
  const router = useRouter();

  useEffect(() => {
    function onNavigate(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (!detail?.href) return;

      router.push(detail.href, { scroll: false });
    }

    window.addEventListener("app:navigate", onNavigate);
    return () => window.removeEventListener("app:navigate", onNavigate);
  }, [router]);

  return null;
}
