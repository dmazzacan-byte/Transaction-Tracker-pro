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

try {
    // Importa la configuración de Firebase desde un archivo local
    const { firebaseConfig } = await import('./firebase/config.js');
    // Inicializa la app de Firebase con la configuración
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    firebaseInitialized = true;
} catch (error) {
    // Si la importación falla, muestra un mensaje de error claro en la consola
    console.error("Error: La configuración de Firebase no se encontró en 'firebase/config.js'.",
        "Por favor, crea el archivo y añade tu configuración de Firebase para continuar.",
        "Puedes encontrar tu configuración en la consola de Firebase de tu proyecto.",
        "El error original fue:", error);
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

const CUSTOMERS_COLLECTION = 'customers';
const addCustomer = (customerData) => addDoc(collection(db, CUSTOMERS_COLLECTION), customerData);
const getCustomers = () => getDocs(collection(db, CUSTOMERS_COLLECTION));
const updateCustomer = (customerId, customerData) => updateDoc(doc(db, CUSTOMERS_COLLECTION, customerId), customerData);
const deleteCustomer = (customerId) => deleteDoc(doc(db, CUSTOMERS_COLLECTION, customerId));

const ORDERS_COLLECTION = 'orders';
const addOrder = (orderData) => addDoc(collection(db, ORDERS_COLLECTION), orderData);
const getOrders = () => getDocs(collection(db, ORDERS_COLLECTION));
const updateOrder = (orderId, orderData) => updateDoc(doc(db, ORDERS_COLLECTION, orderId), orderData);
const deleteOrder = (orderId) => deleteDoc(doc(db, ORDERS_COLLECTION, orderId));

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

