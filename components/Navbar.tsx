"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "react-i18next";
import LangSwitcher from "@/components/LangSwitcher";

const ThreeBall = dynamic(() => import("./3d_spinner"), { ssr: false });

export default function Navbar() {
  const { user, loading } = useCurrentUser();
  const { t } = useTranslation();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "/";
  const defaultAvatar = "/default-avatar.png";

  const handleLogout = () => {
    window.location.href = "/logout";
  };

  const handleLogin = () => {
    const returnTo =
      typeof window !== "undefined" ? window.location.href : appUrl;
    window.location.href = `https://www.jearn.site/cdn-cgi/access/login?return_to=${encodeURIComponent(
      returnTo
    )}`;
  };

  const handleLogoClick = () => {
    if (appUrl) {
      window.location.href = appUrl;
    }
  };

  return (
    <header className="fixed top-0 left-0 w-full bg-white border-b shadow-sm z-50">
      <div className="max-w-5xl mx-auto flex justify-between items-center px-4 py-3 text-black">
        {/* Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={handleLogoClick}
        >
          <div className="w-12 h-8 flex items-center justify-center">
            <ThreeBall />
          </div>
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: "'Shadows Into Light', cursive" }}
          >
            JEARN
          </h1>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <LangSwitcher />

          {loading ? (
            <span className="text-sm text-gray-500">Loading...</span>
          ) : user ? (
            <>
              <Link href="/profile" className="shrink-0">
                <img
                  src={
                    user?.picture && !user.picture.startsWith("9j/")
                      ? user.picture
                      : user?._id
                      ? `/api/user/avatar/${user._id}?t=${Date.now()}`
                      : "/default-avatar.png"
                  }
                  onError={(e) => (e.currentTarget.src = "/default-avatar.png")}
                  alt="avatar"
                  className="w-8 h-8 rounded-full cursor-pointer hover:opacity-80 transition"
                />
              </Link>

              {user.name && (
                <span className="text-black text-sm font-medium truncate max-w-[120px]">
                  {user.name}
                </span>
              )}

              <button
                onClick={handleLogout}
                className="text-sm px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                {t("logout") || "Logout"}
              </button>
            </>
          ) : (
            <button
              onClick={handleLogin}
              className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {t("login") || "Login"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
