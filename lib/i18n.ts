// lib/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

if (!i18n.isInitialized) {
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
          //dashboard
          overview: "Overview",
          analytics: "Analytics",
        },
      },
      ja: {
        translation: {
          jearn: "JEARN",
          logout: "ログアウト",
          login: "ログイン",
          title: "テーマ",
          placeholder: "みんなと共有したいことを入力してください",
          //dashboard
          overview: "概要",
          analytics: "分析",
          database: "データベース",
          settings: "設定",
        },
      },
      my: {
        translation: {
          jearn: "JEARN",
          logout: "အကောင့်ထွက်ရန်",
          login: "ログイン",
          title: "ခေါင်းစဥ်",
          placeholder: "မျှဝေချင်တဲ့အကြောင်းအရာကိုရေးပါ",
          //dashboard
          overview: "ခြုံငုံသုံးသပ်ချက်",
          analytics: "ခွဲခြမ်းစိတ်ဖြာမှု",
          database: "ဒေတာဘေ့စ်",
          settings: "ပြုပြင်ခြင်း",
        },
      },
    },
  });
}

export default i18n;
