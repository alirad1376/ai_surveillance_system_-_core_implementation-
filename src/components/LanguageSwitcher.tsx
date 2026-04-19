import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'fa' : 'en');
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
      title={language === 'en' ? 'Switch to Persian' : 'تغییر به انگلیسی'}
    >
      <span className="text-lg">🌐</span>
      <span className="font-medium">
        {language === 'en' ? 'فا' : 'EN'}
      </span>
    </button>
  );
}
