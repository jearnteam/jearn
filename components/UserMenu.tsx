"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import LangSwitcher from "@/components/LangSwitcher";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

interface User {
  _id: string;
  name?: string;
}

export default function UserMenu({ user }: { user: User }) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  // THEME LOGIC (inside dropdown, always mounted)
  const { theme, setTheme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;

  const toggleTheme = () => {
    setTheme(currentTheme === "dark" ? "light" : "dark");
  };

  const handleLogout = () => router.push("/logout");

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2"
      >
        <Avatar
          id={user._id}
          size={36}
          className="border border-gray-300 dark:border-gray-700"
        />
        {user.name && (
          <span className="hidden sm:block text-sm font-medium truncate max-w-[120px]">
            {user.name}
          </span>
        )}
      </button>

      <div
        className={`
          absolute right-0 mt-2 w-48 rounded-xl shadow-lg border
          bg-white dark:bg-neutral-800 dark:border-neutral-700
          transition-all duration-200 origin-top-right
          ${open ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"}
        `}
      >
        <div className="p-2 flex flex-col gap-1">

          {/* PROFILE */}
          <button
            onClick={() => router.push("/profile")}
            className="px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700 text-left"
          >
            Profile
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
            Toggle Theme
          </button>

          {/* LANGUAGE */}
          <div className="py-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700">
            <LangSwitcher />
          </div>

          {/* DASHBOARD */} {/* TODO: It should shows only admin account */}
          <button
            onClick={() => router.push("/dashboard")}
            className="px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700 text-left"
          >
            Dashboard
          </button>

          {/* LOGOUT */}
          <button
            onClick={handleLogout}
            className="px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md text-left"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
