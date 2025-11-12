"use client";

import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function LangSwitcher() {
  const { i18n } = useTranslation();
  const { status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null; // prevent hydration mismatch

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    i18n.changeLanguage(newLang);

    if (status === "authenticated") {
      try {
        const res = await fetch("/api/user/update-language", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: newLang }),
        });

        if (!res.ok) {
          console.warn("⚠️ Could not save language preference");
        }
      } catch (err) {
        console.error("❌ Failed to save language:", err);
      }
    }
  };

  return (
    <select
      onChange={handleChange}
      value={i18n.language}
      className="px-3 py-1 text-sm border rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      <option value="en">English</option>
      <option value="ja">日本語</option>
      <option value="my">မြန်မာ</option>
    </select>
  );
}
