'use client';

import { useLanguage } from '@/contexts/LanguageProvider';
import ProductList from '@/components/ProductList';
import ProductForm from '@/components/ProductForm';
import { useEffect, useState } from 'react';
import { Product } from '@/lib/types';
import { useAuth } from '@/contexts/AuthProvider';
import { getProducts, addProduct, updateProduct, deleteProduct } from '@/lib/productService';

export default function ProductsPage() {
  const { translations } = useLanguage();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user]);

  const fetchProducts = async () => {
    if (user) {
      const products = await getProducts(user.uid);
      setProducts(products);
    }
  };

  const handleAddProduct = () => {
    setSelectedProduct(undefined);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (user) {
      await deleteProduct(user.uid, productId);
      fetchProducts();
    }
  };

  const handleSaveProduct = async (product: Product) => {
    if (user) {
      if (selectedProduct) {
        await updateProduct(user.uid, { ...product, id: selectedProduct.id });
      } else {
        await addProduct(user.uid, product);
      }
      fetchProducts();
      setIsModalOpen(false);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{translations.products}</h2>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleAddProduct}
        >
          Add Product
        </button>
      </div>
      <ProductList
        products={products}
        onEdit={handleEditProduct}
        onDelete={handleDeleteProduct}
      />
      {isModalOpen && (
        <ProductForm
          product={selectedProduct}
          onSave={handleSaveProduct}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
