import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import zh from "./locales/zh-CN.json";

export const LOCALE_KEY = "dg-hub-locale";

export type AppLocale = "zh-CN" | "en";

export function detectLocale(): AppLocale {
  const saved = localStorage.getItem(LOCALE_KEY);
  if (saved === "en" || saved === "zh-CN") return saved;
  const nav = navigator.language.toLowerCase();
  return nav.startsWith("zh") ? "zh-CN" : "en";
}

export function setLocale(locale: AppLocale) {
  localStorage.setItem(LOCALE_KEY, locale);
  void i18n.changeLanguage(locale);
  document.documentElement.lang = locale === "zh-CN" ? "zh-CN" : "en";
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    "zh-CN": { translation: zh },
  },
  lng: typeof localStorage === "undefined" ? "zh-CN" : detectLocale(),
  fallbackLng: "zh-CN",
  interpolation: { escapeValue: false },
});

export default i18n;
