// firebase.js - Centralized Firebase module
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

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

export { auth, db };
