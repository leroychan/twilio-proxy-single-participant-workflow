import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en.json';
import zh from '@/locales/zh.json';

const STORAGE_KEY = 'demo-ui-lang';

function initialLang(): 'en' | 'zh' {
  if (typeof window === 'undefined') return 'en';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === 'zh' ? 'zh' : 'en';
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, zh: { translation: zh } },
    lng: initialLang(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
}

export const LANG_STORAGE_KEY = STORAGE_KEY;
export default i18n;
