import React, { createContext, useContext, useState, useEffect } from 'react';
import { LanguageCode } from '../types';
import { TRANSLATIONS } from '../translations';
import { apiRequest, getAuthToken } from '../services/api';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('moneyverse_lang') as LanguageCode;
    return saved && TRANSLATIONS[saved] ? saved : 'en';
  });

  const setLanguage = async (newLang: LanguageCode) => {
    setLanguageState(newLang);
    localStorage.setItem('moneyverse_lang', newLang);

    // If user is logged in, sync preferred_language with backend
    if (getAuthToken()) {
      try {
        await apiRequest('/auth/profile', {
          method: 'PUT',
          body: JSON.stringify({ preferred_language: newLang }),
        });
      } catch (e) {
        // Soft fail
      }
    }
  };

  const t = (key: string): string => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
    if (dict[key]) {
      return dict[key];
    }
    // Fallback to English if translation is missing for this key
    return TRANSLATIONS.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
