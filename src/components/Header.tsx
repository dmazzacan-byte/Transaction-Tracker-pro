'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageProvider';

const Header: React.FC = () => {
  const { translations, setLanguage } = useLanguage();

  return (
    <header className="bg-gray-800 text-white p-4 flex justify-between items-center">
      <h1 className="text-2xl font-bold">{translations.title}</h1>
      <select onChange={(e) => setLanguage(e.target.value)} className="bg-gray-800 text-white">
        <option value="en">English</option>
        <option value="es">Español</option>
      </select>
    </header>
  );
};

export default Header;
