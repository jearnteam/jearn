"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import LangSwitcher from "@/components/LangSwitcher";
import { useTheme } from "next-themes";
import { FolderPlus, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import CategoryRequestModal from "./CategoryRequestModal";
import { useSession } from "next-auth/react";

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
  const [showCategoryRequest, setShowCategoryRequest] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);

  /* ✅ FIX: move hook to top */
  const { data: session } = useSession();

  /* ---------------------------------------------
   * THEME
   * ------------------------------------------- */
  const { theme, setTheme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;

  const saveThemeToDB = async (nextTheme: "light" | "dark") => {
    try {
      await fetch("/api/user/update-theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: nextTheme }),
      });
    } catch (err) {
      console.error("Failed to save theme", err);
    }
  };

  const toggleTheme = () => {
    const nextTheme = currentTheme === "dark" ? "light" : "dark";

    window.dispatchEvent(
      new CustomEvent("theme-transition", { detail: { to: nextTheme } })
    );

    setTimeout(() => {
      setTheme(nextTheme);
      saveThemeToDB(nextTheme);
    }, 500);
  };

  const updateNotifications = async (enabled: boolean) => {
    try {
      await fetch("/api/user/update-notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled }),
      });
    } catch (err) {
      console.error("Failed to save notification setting", err);
    }
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

    document.addEventListener("mousedown", handler); // ✅ FIX
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  /* ---------------------------------------------
   * Sync with browser notification permission
   * ------------------------------------------- */
  useEffect(() => {
    if ("Notification" in window) {
      setNotifEnabled(Notification.permission === "granted");
    }
  }, []);

  return (
    <>
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
          <div
            className="p-2 flex flex-col gap-1"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* PROFILE */}
            <button
              onClick={() => {
                setOpen(false);
                router.push("/profile");
              }}
              className="px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700 text-left"
            >
              {t("userMenu.profile")}
            </button>

            {/* THEME */}
            <button
              onClick={() => {
                setOpen(false);
                toggleTheme();
              }}
              className="px-3 py-2 flex items-center gap-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700 text-left"
            >
              {currentTheme === "dark" ? (
                <Sun className="w-5 h-5 text-yellow-400" />
              ) : (
                <Moon className="w-5 h-5 text-gray-800" />
              )}
              {t("userMenu.toggleTheme")}
            </button>

            {/* 🔔 NOTIFICATIONS */}
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();

                if (!notifEnabled) {
                  // 👉 show modal or separate button FIRST
                  // then after permission granted:

                  const permission = await Notification.requestPermission();

                  if (permission === "granted") {
                    setNotifEnabled(true);
                    updateNotifications(true);
                  }
                } else {
                  setNotifEnabled(false);
                  updateNotifications(false);
                }
              }}
              className="flex items-center justify-between w-full px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700"
            >
              <span className="text-sm">
                {t("notifications") || "Notifications"}
              </span>

              <div
                className={`w-10 h-5 flex items-center rounded-full transition ${
                  notifEnabled ? "bg-blue-600" : "bg-gray-400"
                } pointer-events-none`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow transform transition ${
                    notifEnabled ? "translate-x-5" : "translate-x-1"
                  } pointer-events-none`}
                />
              </div>
            </button>

            {/* LANGUAGE */}
            <div className="py-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700">
              <LangSwitcher />
            </div>

            {/* CATEGORY REQUEST */}
            <button
              onClick={() => {
                setShowCategoryRequest(true);
                setOpen(false);
              }}
              className="flex items-center rounded-md gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-neutral-700"
            >
              <FolderPlus size={32} />
              <span>{t("userMenu.requestCategory")}</span>
            </button>

            {/* ✅ ADMIN (SAFE) */}
            {(session?.user?.role === "admin" || user.isAdmin) && (
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/dashboard");
                }}
                className="px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700 text-left"
              >
                {t("dashboard")}
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
              {t("logout")}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showCategoryRequest && (
        <CategoryRequestModal onClose={() => setShowCategoryRequest(false)} />
      )}
    </>
  );
}
