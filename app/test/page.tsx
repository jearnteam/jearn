"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function TestPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <p>Loading...</p>;

  return (
    <div className="p-10 space-y-6 min-h-screen bg-gray-100 dark:bg-gray-900 text-black dark:text-white transition-all">
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        Toggle Theme ({theme})
      </button>

      <div className="w-64 h-32 rounded-lg flex items-center justify-center bg-white dark:bg-green-500 transition-colors">
        Box background ✅
      </div>
    </div>
  );
}
