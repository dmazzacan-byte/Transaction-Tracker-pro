// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfigStr = "__FIREBASE_CONFIG__";

// Initialize Firebase
let app;
try {
    const config = JSON.parse(firebaseConfigStr);
    app = initializeApp(config);
} catch (e) {
    console.error("Firebase initialization failed. This is expected on a deployed site without a config file.", e);
}
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
