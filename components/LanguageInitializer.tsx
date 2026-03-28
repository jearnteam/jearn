"use client";

import { useEffect, useRef } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "react-i18next";

export default function LanguageInitializer() {
  const { user, loading } = useCurrentUser();
  const { i18n } = useTranslation();

  const initialized = useRef(false); // 🔥 KEY

  useEffect(() => {
    if (initialized.current) return; // 🚫 run only once

    const stored = localStorage.getItem("lang");

    if (stored) {
      i18n.changeLanguage(stored);
    } else if (!loading && user?.language) {
      i18n.changeLanguage(user.language);
      localStorage.setItem("lang", user.language);
    }

    initialized.current = true; // ✅ lock it
  }, [i18n, user, loading]);

  return null;
}