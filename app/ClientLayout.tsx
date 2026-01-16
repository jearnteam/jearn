"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { useState, useEffect } from "react";
import ThemeTransitionOverlay from "@/components/ThemeTransitionOverlay";
import { ScrollProvider } from "@/components/3d_spinner/ScrollContext";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const observer = new MutationObserver(() => {
      console.log(
        "🧠 <html> class changed:",
        document.documentElement.className
      );
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);
  const [themeAnimating, setThemeAnimating] = useState(false);
  const [themeTo, setThemeTo] = useState<"light" | "dark">("light");

  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ to: "light" | "dark" }>;
      setThemeTo(ev.detail.to);
      setThemeAnimating(true);
    };

    window.addEventListener("theme-transition", handler);
    return () => window.removeEventListener("theme-transition", handler);
  }, []);

  return (
    <>
      {/* GLOBAL THEME TRANSITION */}
      <ThemeTransitionOverlay
        active={themeAnimating}
        to={themeTo}
        onDone={() => setThemeAnimating(false)}
      />

      <SessionProvider><ScrollProvider>{children}</ScrollProvider></SessionProvider>
    </>
  );
}
