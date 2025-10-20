// lib/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: {
      translation: {
        jearn: "JEARN",
        logout: "Logout",
        login: "Login",
        title: "title",
        placeholder: "Type in what you wanna share with everyone",
        heading1: "H1",
        heading2: "H2",
        heading3: "H3",
      },
    },
    ja: {
      translation: {
        jearn: "JEARN", // or a Japanese name if you want
        logout: "ログアウト",
        login: "ログイン",
        title: "テーマ",
        placeholder: "みんなと共有したいことを入力してください",
        heading1: "見出し1",
        heading2: "見出し2",
        heading3: "見出し3",
      },
    },
  },
});

export default i18n;
