"use client";

import "@/lib/i18n/index"; // safe here because it's now only in the client bundle
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n/index"; // your exported i18n instance

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
