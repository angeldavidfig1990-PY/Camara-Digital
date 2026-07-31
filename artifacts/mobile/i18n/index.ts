import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

// Import translations
import es from './locales/es.json';
import en from './locales/en.json';
import gn from './locales/gn.json';

const resources = {
  es: { translation: es },
  en: { translation: en },
  gn: { translation: gn },
};

// Initialize i18n immediately when this file is imported
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getLocales()[0]?.languageCode || 'es',
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
export { i18n };
