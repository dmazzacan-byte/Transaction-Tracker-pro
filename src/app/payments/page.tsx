'use client';

import { useLanguage } from '@/contexts/LanguageProvider';

export default function PaymentsPage() {
  const { translations } = useLanguage();

  return (
    <div>
      <h2 className="text-2xl font-bold">{translations.payments}</h2>
    </div>
  );
}
