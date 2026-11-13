import i18next, { type i18n as I18nInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { SHELL_STRINGS } from "./strings.js";

function initialLanguage(): "en" | "fr" {
  if (typeof localStorage === "undefined") return "en";
  return localStorage.getItem("the-app-language") === "fr" ? "fr" : "en";
}

export const i18n: I18nInstance = i18next.createInstance();

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: SHELL_STRINGS.en },
    fr: { translation: SHELL_STRINGS.fr },
  },
  lng: initialLanguage(),
  fallbackLng: "en",
  initImmediate: false,
  interpolation: { escapeValue: false },
  returnNull: false,
});
