"use client";

import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { signIn } from "next-auth/react";

const ThreeBall = dynamic(() => import("./3d_spinner/3d_spinner"), {
  ssr: false,
  loading: () => null,
});

export default function PublicNavbar() {
  const { t } = useTranslation();
  const navbarRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  /* ---------------------------------------------
   * Hydration gate (same as app navbar)
   * ------------------------------------------- */
  useEffect(() => {
    setMounted(true);
  }, []);

  /* Prevent accidental touch scroll */
  useEffect(() => {
    const el = navbarRef.current;
    if (!el) return;

    const prevent = (e: TouchEvent) => e.preventDefault();
    el.addEventListener("touchmove", prevent, { passive: false });

    return () => el.removeEventListener("touchmove", prevent);
  }, []);

  /* ---------------------------------------------
   * SSR-safe placeholder
   * ------------------------------------------- */
  if (!mounted) {
    return (
      <header
        ref={navbarRef}
        className="
          fixed top-0 left-0 w-full z-50
          bg-white dark:bg-neutral-900
          border-b shadow-sm
        "
      >
        <div className="mx-auto flex justify-between items-center px-4 h-16">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12" />
            <h1
              className="text-4xl font-bold"
              style={{ fontFamily: "var(--font-shadows-into-light)" }}
            >
              JEARN
            </h1>
          </div>

          <div className="w-full max-w-md h-10 rounded-full bg-gray-100 dark:bg-neutral-800" />

          <div className="w-20 h-8 rounded bg-gray-200 dark:bg-neutral-700" />
        </div>
      </header>
    );
  }

  /* ---------------------------------------------
   * Client render
   * ------------------------------------------- */
  return (
    <header
      ref={navbarRef}
      className="
        fixed top-0 left-0 w-full z-50
        bg-white dark:bg-neutral-900
        border-b shadow-sm
      "
    >
      <div className="mx-auto flex gap-4 justify-around items-center px-4 h-16">
        {/* Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => {
            if (window.location.pathname === "/") {
              window.location.reload();
            } else {
              window.location.href = "/";
            }
          }}
        >
          <div className="w-12 h-12 flex items-center justify-center">
            <ThreeBall />
          </div>

          <h1
            className="text-4xl font-bold"
            style={{ fontFamily: "var(--font-shadows-into-light)" }}
          >
            {t("jearn")}
          </h1>
        </div>

        {/* Right — LOGIN CTA */}
        <div className="flex flex-shrink-0 items-center gap-3">
          <button
            onClick={() =>
              signIn("google", {
                callbackUrl: window.location.pathname,
              })
            }
            className="
              px-4 py-2 rounded-md text-sm font-semibold
              bg-black text-white
              hover:bg-neutral-800
              dark:bg-white dark:text-black dark:hover:bg-neutral-200
            "
          >
            {t("login")}
          </button>
        </div>
      </div>
    </header>
  );
}
