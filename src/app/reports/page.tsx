'use client';

import { useLanguage } from '@/contexts/LanguageProvider';

export default function ReportsPage() {
  const { translations } = useLanguage();

  return (
    <div>
      <h2 className="text-2xl font-bold">{translations.reports}</h2>
    </div>
  );
}
