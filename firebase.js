import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let app, auth, db;
let firebaseInitialized = false;

// Intenta cargar la configuración de forma dinámica
try {
    const { firebaseConfig } = await import('./firebase/config.js');
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    firebaseInitialized = true;
} catch (error) {
    console.error("Firebase initialization failed:", error);
}

// Auth functions
const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
const logout = () => signOut(auth);
const monitorAuthState = (callback) => onAuthStateChanged(auth, callback);

// Product functions
    console.error("Firebase initialization failed. This is expected on a deployed site without a config file.", error);
}

// Funciones de autenticación (verifican si Firebase está inicializado)
const login = (email, password) => auth ? signInWithEmailAndPassword(auth, email, password) : Promise.reject("Firebase not initialized");
const logout = () => auth ? signOut(auth) : Promise.reject("Firebase not initialized");
const monitorAuthState = (callback) => auth ? onAuthStateChanged(auth, callback) : callback(null);

// Funciones de base de datos
const PRODUCTS_COLLECTION = 'products';
const addProduct = (productData) => addDoc(collection(db, PRODUCTS_COLLECTION), productData);
const getProducts = () => getDocs(collection(db, PRODUCTS_COLLECTION));
const updateProduct = (productId, productData) => updateDoc(doc(db, PRODUCTS_COLLECTION, productId), productData);
const deleteProduct = (productId) => deleteDoc(doc(db, PRODUCTS_COLLECTION, productId));

// Customer functions
const CUSTOMERS_COLLECTION = 'customers';
const addCustomer = (customerData) => addDoc(collection(db, CUSTOMERS_COLLECTION), customerData);
const getCustomers = () => getDocs(collection(db, CUSTOMERS_COLLECTION));
const updateCustomer = (customerId, customerData) => updateDoc(doc(db, CUSTOMERS_COLLECTION, customerId), customerData);
const deleteCustomer = (customerId) => deleteDoc(doc(db, CUSTOMERS_COLLECTION, customerId));

// Order functions
const ORDERS_COLLECTION = 'orders';
const addOrder = (orderData) => addDoc(collection(db, ORDERS_COLLECTION), orderData);
const getOrders = () => getDocs(collection(db, ORDERS_COLLECTION));
const updateOrder = (orderId, orderData) => updateDoc(doc(db, ORDERS_COLLECTION, orderId), orderData);
const deleteOrder = (orderId) => deleteDoc(doc(db, ORDERS_COLLECTION, orderId));

// Payment functions
const PAYMENTS_COLLECTION = 'payments';
const addPayment = (paymentData) => addDoc(collection(db, PAYMENTS_COLLECTION), paymentData);
const getPayments = () => getDocs(collection(db, PAYMENTS_COLLECTION));
const updatePayment = (paymentId, paymentData) => updateDoc(doc(db, PAYMENTS_COLLECTION, paymentId), paymentData);
const deletePayment = (paymentId) => deleteDoc(doc(db, PAYMENTS_COLLECTION, paymentId));

export {
    firebaseInitialized,
    auth,
    login,
    logout,
    monitorAuthState,
    addProduct,
    getProducts,
    updateProduct,
    deleteProduct,
    addCustomer,
    getCustomers,
    updateCustomer,
    deleteCustomer,
    addOrder,
    getOrders,
    updateOrder,
    deleteOrder,
    addPayment,
    getPayments,
    updatePayment,
    deletePayment
};

