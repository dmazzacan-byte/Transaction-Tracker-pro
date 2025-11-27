'use client';

import { Product } from '@/lib/types';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageProvider';

interface ProductFormProps {
  product?: Product;
  onSave: (product: Product) => void;
  onCancel: () => void;
}

export default function ProductForm({ product, onSave, onCancel }: ProductFormProps) {
  const { translations } = useLanguage();
  const [name, setName] = useState(product?.name || '');
  const [retailPrice, setRetailPrice] = useState(product?.retailPrice || 0);
  const [wholesalePrice, setWholesalePrice] = useState(product?.wholesalePrice || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, retailPrice, wholesalePrice });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <form onSubmit={handleSubmit}>
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            {product ? translations.editProduct : translations.addProduct}
          </h3>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              {translations.name}
            </label>
            <input
              type="text"
              name="name"
              id="name"
              className="mt-1 p-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="retailPrice" className="block text-sm font-medium text-gray-700">
              {translations.retailPrice}
            </label>
            <input
              type="number"
              name="retailPrice"
              id="retailPrice"
              className="mt-1 p-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              value={retailPrice}
              onChange={(e) => setRetailPrice(Number(e.target.value))}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="wholesalePrice" className="block text-sm font-medium text-gray-700">
              {translations.wholesalePrice}
            </label>
            <input
              type="number"
              name="wholesalePrice"
              id="wholesalePrice"
              className="mt-1 p-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              value={wholesalePrice}
              onChange={(e) => setWholesalePrice(Number(e.target.value))}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={onCancel}
            >
              {translations.cancel}
            </button>
            <button
              type="submit"
              className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {translations.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
