"use client";

import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const LANGS = {
  en: "🇺🇸 English",
  ja: "🇯🇵 日本語",
  my: "🇲🇲 မြန်မာ",
} as const;

// 👇 Create a type from LANGS keys
type SupportedLang = keyof typeof LANGS;

export default function LangSwitcher() {
  const { i18n } = useTranslation();
  const { status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // 👇 Ensure language is one of the supported keys
  const currentLang = (i18n.language as SupportedLang) || "en";

  const changeLanguage = async (lang: SupportedLang) => {
    i18n.changeLanguage(lang);
    setOpen(false);

    if (status === "authenticated") {
      await fetch("/api/user/update-language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      });
    }
  };

  return (
    <div className="relative text-sm">
      {/* Main button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 flex justify-between items-center hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-md"
      >
        <span>{LANGS[currentLang]}</span>
        <span>▼</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute mt-1 w-full rounded-md bg-white dark:bg-neutral-800 border dark:border-neutral-700 shadow-lg z-20"
        >
          {Object.entries(LANGS).map(([key, label]) => (
            <button
              key={key}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-md"
              onClick={() => changeLanguage(key as SupportedLang)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
