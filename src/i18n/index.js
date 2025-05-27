import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import arTranslations from './ar.json';
import enTranslations from './en.json';

const resources = {
  ar: {
    translation: arTranslations
  },
  en: {
    translation: enTranslations
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ar', // Default language is Arabic
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  });

export default i18n; 