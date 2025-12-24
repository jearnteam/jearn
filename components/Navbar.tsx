"use client";

import dynamic from "next/dynamic";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "react-i18next";
import UserMenu from "@/components/UserMenu";
import { useState, useEffect, useRef, memo } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

const ThreeBall = dynamic(() => import("./3d_spinner"), {
  ssr: false,
  loading: () => null,
});

// Memoize to avoid rerenders
const MemoUserMenu = memo(UserMenu);

export default function Navbar() {
  const { user, loading } = useCurrentUser();
  const { t } = useTranslation();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const navbarRef = useRef<HTMLElement | null>(null);

  // ✅ hydration gate
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent accidental touch-scroll on navbar
  useEffect(() => {
    const el = navbarRef.current;
    if (!el) return;

    const prevent = (e: TouchEvent) => e.preventDefault();
    el.addEventListener("touchmove", prevent, { passive: false });

    return () => el.removeEventListener("touchmove", prevent);
  }, []);

  /* ------------------------------------------------
   * SSR-SAFE SHELL (NO HYDRATION MISMATCH)
   * ------------------------------------------------ */
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

          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-neutral-700" />
        </div>
      </header>
    );
  }

  /* ------------------------------------------------
   * CLIENT RENDER (SAFE)
   * ------------------------------------------------ */
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
              window.location.reload(); // 🔥 true refresh
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
            {t("jearn") || "JEARN"}
          </h1>
        </div>

        {/* Search */}
        <div className="flex items-center w-full max-w-md">
          <label htmlFor="search-input" className="sr-only">
            {t("search") || "Search"}
          </label>

          <div
            className="
              flex items-center w-full px-4 py-2
              bg-white dark:bg-black
              border border-gray-300 rounded-full
              shadow-sm
              focus-within:ring-2 focus-within:ring-blue-500
            "
          >
            <Search className="w-6 h-6 text-gray-400 mr-3" strokeWidth={3} />
            <input
              type="text"
              placeholder={t("search") || "Search"}
              className="
                w-full bg-transparent
                text-gray-700 dark:text-gray-100
                placeholder-gray-500 dark:placeholder-gray-400
                focus:outline-none
              "
            />
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-shrink-0 items-center gap-3">
          {loading ? (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t("loading")}...
            </span>
          ) : user ? (
            <MemoUserMenu user={user} />
          ) : null}
        </div>
      </div>
    </header>
  );
}
