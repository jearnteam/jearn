"use client";

import { useEffect } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser"; // ✅ adjust path as needed
import { useTranslation } from "react-i18next";

export default function LanguageInitializer() {
  const { user, loading } = useCurrentUser();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (!loading && user?.language && i18n.language !== user.language) {
      i18n.changeLanguage(user.language);
    }
  }, [loading, user, i18n]);

  return null;
}
