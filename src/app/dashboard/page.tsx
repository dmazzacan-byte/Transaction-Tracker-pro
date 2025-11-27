'use client';

import { useLanguage } from '@/contexts/LanguageProvider';

export default function DashboardPage() {
  const { translations } = useLanguage();

  return (
    <div>
      <h2 className="text-2xl font-bold">{translations.dashboard}</h2>
    </div>
  );
}
