import { db } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Product } from './types';

const getProducts = async (userId: string): Promise<Product[]> => {
  const productsCol = collection(db, 'users', userId, 'products');
  const productSnapshot = await getDocs(productsCol);
  const productList = productSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Product));
  return productList;
};

const addProduct = async (userId: string, product: Product) => {
  const productsCol = collection(db, 'users', userId, 'products');
  const docRef = await addDoc(productsCol, product);
  return docRef.id;
};

const updateProduct = async (userId: string, product: Product) => {
  if (!product.id) {
    throw new Error('Product ID is required to update a document.');
  }
  const productDoc = doc(db, 'users', userId, 'products', product.id);
  await updateDoc(productDoc, { ...product });
};

const deleteProduct = async (userId: string, productId: string) => {
  const productDoc = doc(db, 'users', userId, 'products', productId);
  await deleteDoc(productDoc);
};

export { getProducts, addProduct, updateProduct, deleteProduct };
