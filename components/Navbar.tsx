"use client";

import dynamic from "next/dynamic";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "react-i18next";
import LangSwitcher from "@/components/LangSwitcher";

const ThreeBall = dynamic(() => import("./3d_spinner"), { ssr: false });

export default function Navbar() {
  const { user } = useCurrentUser();
  const { t } = useTranslation();

  const handleLogout = () => {
    // 👇 just redirect to your /logout page
    window.location.href = "/logout";
  };

  const handleLogin = () => {
    const returnTo =
      typeof window !== "undefined" ? window.location.href : "https://www.jearn.site";
    window.location.href = `https://www.jearn.site/cdn-cgi/access/login?return_to=${encodeURIComponent(
      returnTo
    )}`;
  };

  return (
    <header className="fixed top-0 left-0 w-full bg-white border-b shadow-sm z-50">
      <div className="max-w-5xl mx-auto flex justify-between items-center px-4 py-3 text-black">
        <div className="flex items-center gap-3">
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

        <div className="flex items-center gap-3">
          <LangSwitcher />
          {user ? (
            <>
              {user.picture && (
                <img
                  src={user.picture}
                  alt="avatar"
                  className="w-8 h-8 rounded-full border"
                />
              )}
              <span className="text-black text-sm">{user.name || user.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                {t("logout") || "Logout"}
              </button>
            </>
          ) : (
            <>
              <span>hello</span>
              <button
                onClick={handleLogin}
                className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {t("login") || "Login"}
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
