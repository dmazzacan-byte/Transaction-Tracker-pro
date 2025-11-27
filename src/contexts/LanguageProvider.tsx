'use client';

import React, { createContext, useState, useEffect, useContext } from 'react';

interface LanguageContextType {
  language: string;
  translations: { [key: string]: string };
  setLanguage: (language: string) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [translations, setTranslations] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchTranslations = async () => {
      const response = await fetch(`/locales/${language}.json`);
      const data = await response.json();
      setTranslations(data);
    };
    fetchTranslations();
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, translations, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
