"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "react-i18next";
import LangSwitcher from "@/components/LangSwitcher";
import { signOut } from "next-auth/react";
import ThemeToggle from "@/components/ThemeToggle";
import Avatar from "@/components/Avatar";
import { useState, useEffect } from "react";

// ⛔ Removed LoadingOwl completely
// ⛔ Removed loading: () => <LoadingOwl />

const ThreeBall = dynamic(() => import("./3d_spinner"), {
  ssr: false,
  loading: () => null, // Cleaner fallback
});

export default function Navbar() {
  const { user, loading } = useCurrentUser();
  const { t } = useTranslation();

  const [hydrated, setHydrated] = useState(false);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "/";

  useEffect(() => {
    setHydrated(true);
  }, []);

  const handleLogoClick = () => {
    window.location.href = appUrl;
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white dark:bg-neutral-900 border-b shadow-sm">
      <div className="max-w-5xl mx-auto flex justify-between items-center px-4 h-16">
        
        {/* LOGO */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={handleLogoClick}
        >
          <div className="w-12 h-12 flex items-center justify-center">
            {hydrated ? <ThreeBall /> : null}
          </div>

          <h1
            className="text-4xl font-bold"
            style={{ fontFamily: "var(--font-shadows-into-light)" }}
          >
            JEARN
          </h1>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LangSwitcher />

          {/* Removed owl fallback here */}
          {!hydrated ? (
            <div className="w-8 h-8" />
          ) : loading ? (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Loading...
            </span>
          ) : user ? (
            <>
              <Link href="/profile" className="shrink-0">
                <Avatar
                  id={user._id}
                  size={36}
                  className="border border-gray-300 dark:border-gray-700"
                />
              </Link>

              {user.name && (
                <span className="text-sm font-medium truncate max-w-[120px]">
                  {user.name}
                </span>
              )}

              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-sm text-red-500 hover:underline"
              >
                {t("logout") || "Logout"}
              </button>
            </>
          ) : (
            <button
              onClick={() => (window.location.href = "/api/auth/signin")}
              className="
                text-sm px-3 py-1 rounded
                bg-blue-600 text-white hover:bg-blue-700
                dark:bg-blue-500 dark:hover:bg-blue-600
              "
            >
              {t("login") || "Login"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
