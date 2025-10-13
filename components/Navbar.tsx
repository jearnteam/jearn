"use client";

import Image from "next/image";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "react-i18next";
import LangSwitcher from "@/components/LangSwitcher";
import ThreeBall from "./3d_spinner";

export default function Navbar() {
  const { user } = useCurrentUser();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });

    const teamDomain = "https://jearn.cloudflareaccess.com";
    const appDomain = "https://kioh.jearn.site";

    const loginUrl = `${teamDomain}/cdn-cgi/access/login/${encodeURIComponent(
      "kioh.jearn.site"
    )}?force_reauth=true&return_to=${encodeURIComponent(appDomain)}`;

    const logoutUrl = `${teamDomain}/cdn-cgi/access/logout?return_to=${encodeURIComponent(
      loginUrl
    )}`;

    window.location.href = logoutUrl;
  };

  return (
    <header className="fixed top-0 left-0 w-full bg-white border-b shadow-sm z-50">
      <div className="max-w-5xl mx-auto flex justify-between items-center px-4 py-3 text-black">
        <div className="flex items-center gap-3">
          <ThreeBall />
          <h1
            className="text-xl font-semibold"
            style={{ fontFamily: "'Shadows Into Light', cursive" }}
          >
            JEARN
          </h1>
        </div>

        {/* RIGHT SIDE: Language + User Info */}
        <div className="flex items-center gap-3">
          <LangSwitcher />

          {user ? (
            <>
              {user.picture && (
                <Image
                  src={user.picture}
                  alt="avatar"
                  width={32}
                  height={32}
                  className="rounded-full border"
                  priority
                />
              )}
              <span className="text-black text-sm">
                {user.name || user.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                {t("logout") || "Logout"}
              </button>
            </>
          ) : (
            <span className="text-gray-600 text-sm">
              {t("notLoggedIn") || "🔒 Not logged in"}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
