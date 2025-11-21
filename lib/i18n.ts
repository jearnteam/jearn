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
          share: "Share",
          edit: "Edit",
          delete: "Delete",
          report: "Report",
          reported: "Reported",
          comments: "Comments",
          addComment: "Add Comment",
          //dashboard
          overview: "Overview",
          analytics: "Analytics",
          notification: "Notification",
          reports: "Reports",
        },
      },
      ja: {
        translation: {
          jearn: "JEARN",
          logout: "ログアウト",
          login: "ログイン",
          title: "テーマ",
          placeholder: "みんなと共有したいことを入力してください",
          share: "共有",
          edit: "編集",
          delete: "削除",
          report: "通報",
          reported: "通報済み",
          comments: "コメント",
          addComment: "コメントを追加",
          //dashboard
          overview: "概要",
          analytics: "分析",
          database: "データベース",
          settings: "設定",
          notification: "通知",
          reports: "通報",
        },
      },
      my: {
        translation: {
          jearn: "JEARN",
          logout: "အကောင့်ထွက်ရန်",
          login: "ログイン",
          title: "ခေါင်းစဥ်",
          placeholder: "မျှဝေချင်တဲ့အကြောင်းအရာကိုရေးပါ",
          share: null,
          edit: "Edit",
          delete: "Delete",
          report: "Report",
          reported: "Reported",
          comments: "Comments",
          addComment: "Add Comment",
          //dashboard
          overview: "ခြုံငုံသုံးသပ်ချက်",
          analytics: "ခွဲခြမ်းစိတ်ဖြာမှု",
          database: "ဒေတာဘေ့စ်",
          settings: "ပြုပြင်ခြင်း",
          notification: "အသိပေးချက်",
          reports: "တိုင်ကြားစာ",
        },
      },
    },
  });
}

export default i18n;
