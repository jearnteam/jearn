"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import LangSwitcher from "@/components/LangSwitcher";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";

interface User {
  _id: string;
  name?: string;
  email?: string;
  isAdmin: boolean;
  avatarUrl?: string;
  avatarUpdatedAt?: string | Date;
}

export default function UserMenu({ user }: { user: User }) {
  const { t } = useTranslation();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  /* ---------------------------------------------
   * THEME
   * ------------------------------------------- */
  const { theme, setTheme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;

  /** Persist theme in DB (same as before) */
  const saveThemeToDB = async (nextTheme: "light" | "dark") => {
    try {
      await fetch("/api/user/update-theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: nextTheme }),
      });
    } catch (err) {
      console.error("❌ Failed to save theme", err);
    }
  };

  const toggleTheme = () => {
    const nextTheme = currentTheme === "dark" ? "light" : "dark";

    console.log("🎨 toggle theme →", nextTheme);

    // 🔵 start animated overlay
    window.dispatchEvent(
      new CustomEvent("theme-transition", { detail: { to: nextTheme } })
    );

    // 🔁 flip theme during peak cover
    setTimeout(() => {
      setTheme(nextTheme);
      saveThemeToDB(nextTheme); // ✅ persist
    }, 500);
  };

  const handleLogout = () => router.push("/logout");

  /* ---------------------------------------------
   * CLOSE ON OUTSIDE CLICK
   * ------------------------------------------- */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* BUTTON */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2"
      >
        <Avatar
          id={user._id}
          url={user.avatarUrl}
          updatedAt={user.avatarUpdatedAt}
          size={36}
        />
        {user.name && (
          <span className="hidden sm:block text-sm font-medium truncate max-w-[120px]">
            {user.name}
          </span>
        )}
      </button>

      {/* DROPDOWN */}
      <div
        className={`
          absolute right-0 mt-2 w-48 rounded-xl shadow-lg border
          bg-white dark:bg-neutral-800 dark:border-neutral-700
          transition-all duration-200 origin-top-right z-50
          ${
            open
              ? "scale-100 opacity-100"
              : "scale-95 opacity-0 pointer-events-none"
          }
        `}
      >
        <div className="p-2 flex flex-col gap-1">
          {/* PROFILE */}
          <button
            onClick={() => {
              setOpen(false);
              router.push("/profile");
            }}
            className="px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700 text-left"
          >
            {t("profile") || "Profile"}
          </button>

          {/* THEME */}
          <button
            onClick={toggleTheme}
            className="px-3 py-2 flex items-center gap-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700 text-left"
          >
            {currentTheme === "dark" ? (
              <Sun className="w-5 h-5 text-yellow-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-800" />
            )}
            {t("toggleTheme") || "Toggle Theme"}
          </button>

          {/* LANGUAGE */}
          <div className="py-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700">
            <LangSwitcher />
          </div>

          {/* Category Request */}
          <button
            onClick={() => {
              setOpen(false);
              // TODO:
            }}
            className="px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700 text-left"
          >
            {t("categoryRequest") || "Request Category"}
          </button>

          {/* ADMIN */}
          {user.isAdmin && (
            <button
              onClick={() => {
                setOpen(false);
                router.push("/dashboard");
              }}
              className="px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700 text-left"
            >
              {t("dashboard") || "Dashboard"}
            </button>
          )}

          {/* LOGOUT */}
          <button
            onClick={() => {
              setOpen(false);
              handleLogout();
            }}
            className="px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md text-left"
          >
            {t("logout") || "Logout"}
          </button>
        </div>
      </div>
    </div>
  );
}
