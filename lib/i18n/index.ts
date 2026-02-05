import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./en";
import ja from "./ja";
import my from "./my";

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    lng: "en",
    fallbackLng: "en",
    resources: {
      en,
      ja,
      my,
    },
    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18n;
