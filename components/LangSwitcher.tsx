"use client";

import { useTranslation } from "react-i18next";

export default function LangSwitcher() {
  const { i18n } = useTranslation();

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === "en" ? "ja" : "en");
  };

  return (
    <button
      onClick={toggleLang}
      className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
    >
      {i18n.language === "en" ? "日本語" : "English"}
    </button>
  );
}
