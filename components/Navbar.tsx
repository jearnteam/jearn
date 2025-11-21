"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "react-i18next";
import LangSwitcher from "@/components/LangSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import Avatar from "@/components/Avatar";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const ThreeBall = dynamic(() => import("./3d_spinner"), {
  ssr: false,
  loading: () => null,
});

export default function Navbar() {
  const { user, loading } = useCurrentUser();
  const { t } = useTranslation();
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const handleLogoClick = () => {
    router.push("/"); // SPA navigation
  };

  // 🚪 Redirect to local logout page (which handles Google + NextAuth logout)
  const handleLogout = () => {
    router.push("/logout");
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white dark:bg-neutral-900 border-b shadow-sm">
      <div className="max-w-5xl mx-auto flex justify-between items-center px-4 h-16">
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

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LangSwitcher />

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
                onClick={handleLogout}
                className="text-sm text-red-500 hover:underline"
              >
                {t("logout") || "Logout"}
              </button>
            </>
          ) : (
            null
          )}
        </div>
      </div>
    </header>
  );
}
