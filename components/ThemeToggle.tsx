"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useSession } from "next-auth/react";

export default function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const { status } = useSession(); // detect login status
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null; // prevent hydration mismatch

  const currentTheme = theme === "system" ? systemTheme : theme;

  const toggleTheme = async () => {
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    setTheme(newTheme);

    // ✅ If user is logged in, persist the theme in DB
    if (status === "authenticated") {
      try {
        const res = await fetch("/api/user/update-theme", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: newTheme }),
        });

        if (!res.ok) {
          console.warn("⚠️ Could not save theme preference");
        }
      } catch (err) {
        console.error("❌ Failed to save theme:", err);
      }
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full transition-colors duration-300 
                 bg-gray-200 hover:bg-gray-300 
                 dark:bg-gray-700 dark:hover:bg-gray-600"
      aria-label="Toggle Dark Mode"
    >
      {currentTheme === "dark" ? (
        <Sun className="w-5 h-5 text-yellow-400" />
      ) : (
        <Moon className="w-5 h-5 text-gray-800" />
      )}
    </button>
  );
}
