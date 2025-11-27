'use client';

import { useLanguage } from '@/contexts/LanguageProvider';

export default function OrdersPage() {
  const { translations } = useLanguage();

  return (
    <div>
      <h2 className="text-2xl font-bold">{translations.orders}</h2>
    </div>
  );
}
