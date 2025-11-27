'use client';

import { useLanguage } from '@/contexts/LanguageProvider';

export default function SettingsPage() {
  const { translations } = useLanguage();

  return (
    <div>
      <h2 className="text-2xl font-bold">{translations.settings}</h2>
    </div>
  );
}
