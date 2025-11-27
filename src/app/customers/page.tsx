'use client';

import { useLanguage } from '@/contexts/LanguageProvider';

export default function CustomersPage() {
  const { translations } = useLanguage();

  return (
    <div>
      <h2 className="text-2xl font-bold">{translations.customers}</h2>
    </div>
  );
}
