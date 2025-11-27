'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageProvider';

const Tabs: React.FC = () => {
  const { translations } = useLanguage();

  return (
    <nav className="bg-gray-200 p-4">
      <ul className="flex space-x-4">
        <li><Link href="/dashboard" className="text-gray-700 hover:text-gray-900">{translations.dashboard}</Link></li>
        <li><Link href="/orders" className="text-gray-700 hover:text-gray-900">{translations.orders}</Link></li>
        <li><Link href="/products" className="text-gray-700 hover:text-gray-900">{translations.products}</Link></li>
        <li><Link href="/customers" className="text-gray-700 hover:text-gray-900">{translations.customers}</Link></li>
        <li><Link href="/payments" className="text-gray-700 hover:text-gray-900">{translations.payments}</Link></li>
        <li><Link href="/reports" className="text-gray-700 hover:text-gray-900">{translations.reports}</Link></li>
        <li><Link href="/settings" className="text-gray-700 hover:text-gray-900">{translations.settings}</Link></li>
      </ul>
    </nav>
  );
};

export default Tabs;
