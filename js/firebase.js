// firebase.js - Centralized Firebase module
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";

// Auth imports
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

// Firestore imports
import {
    getFirestore,
    collection,
    doc,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    writeBatch
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAYYYmJDKvXJTGfwQ1ZYfhzmZAjl3hoHe8",
    authDomain: "gestionador-09021226-17c1c.firebaseapp.com",
    projectId: "gestionador-09021226-17c1c",
    storageBucket: "gestionador-09021226-17c1c.firebasestorage.app",
    messagingSenderId: "22022249768",
    appId: "1:22022249768:web:bf48a88ce0b22628bfc41d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export services and all required functions
export {
    auth,
    db,
    // Auth functions
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    // Firestore functions
    collection,
    doc,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    writeBatch
};
