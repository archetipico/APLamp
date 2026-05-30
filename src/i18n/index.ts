import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enCommon from "../locales/en/common.json";
import enGlyphs from "../locales/en/glyphs.json";
import enExercises from "../locales/en/exercises.json";
import itCommon from "../locales/it/common.json";
import itGlyphs from "../locales/it/glyphs.json";
import itExercises from "../locales/it/exercises.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, glyphs: enGlyphs, exercises: enExercises },
      it: { common: itCommon, glyphs: itGlyphs, exercises: itExercises },
    },
    ns: ["common", "glyphs", "exercises"],
    defaultNS: "common",
    fallbackLng: "en",
    supportedLngs: ["en", "it"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["cookie", "navigator"],
      caches: ["cookie"],
      lookupCookie: "lang",
      cookieMinutes: 525600,
      cookieOptions: { path: "/", sameSite: "strict" },
    },
  });

export default i18n;
