"use client";

import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const LANGS = {
  en: { label: "English", flag: "1f1fa-1f1f8" }, // 🇺🇸
  ja: { label: "日本語", flag: "1f1ef-1f1f5" }, // 🇯🇵
  my: { label: "မြန်မာ", flag: "1f1f2-1f1f2" }, // 🇲🇲
} as const;

type SupportedLang = keyof typeof LANGS;

export default function LangSwitcher() {
  const { i18n } = useTranslation();
  const { status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

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
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 flex justify-between items-center hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-md"
      >
        <span className="flex items-center gap-2">
          <img
            src={`https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${LANGS[currentLang].flag}.svg`}
            className="w-5 h-5"
            alt=""
          />
          {LANGS[currentLang].label}
        </span>
        <span>▼</span>
      </button>

      {open && (
        <div className="absolute mt-1 w-full rounded-md bg-white dark:bg-neutral-800 border dark:border-neutral-700 shadow-lg z-20">
          {Object.entries(LANGS).map(([key, item]) => (
            <button
              key={key}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-md flex items-center gap-2"
              onClick={() => changeLanguage(key as SupportedLang)}
            >
              <img
                src={`https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${item.flag}.svg`}
                className="w-5 h-5"
                alt=""
              />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
