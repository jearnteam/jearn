"use client";

import { useEffect } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "react-i18next";

export default function LanguageInitializer() {
  const { user, loading } = useCurrentUser();
  const { i18n } = useTranslation();

  // 🔥 STEP 1: restore from localStorage instantly
  useEffect(() => {
    const stored = localStorage.getItem("lang");
    if (stored && i18n.language !== stored) {
      i18n.changeLanguage(stored);
    }
  }, [i18n]);

  // 🔥 STEP 2: override with DB value when available
  useEffect(() => {
    if (!loading && user?.language && i18n.language !== user.language) {
      i18n.changeLanguage(user.language);
      localStorage.setItem("lang", user.language); // keep in sync
    }
  }, [loading, user, i18n]);

  return null;
}
