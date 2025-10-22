"use client";

import { useTranslation } from "react-i18next";

export default function LangSwitcher() {
  const { i18n } = useTranslation();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <select
      onChange={handleChange}
      value={i18n.language}
      className="px-3 py-1 text-sm border rounded cursor-pointer hover:bg-gray-100"
    >
      <option value="en">English</option>
      <option value="ja">日本語</option>
      <option value="my">မြန်မာ</option>
    </select>
  );
}
