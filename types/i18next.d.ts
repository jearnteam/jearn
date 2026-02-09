import "i18next";
import en from "@/lib/i18n/en";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: typeof en;
  }
}
