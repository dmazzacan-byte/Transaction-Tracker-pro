import { auth, db } from './firebase.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { showNotification } from './utils.js';

let currentUser = null;

export function getCurrentUser() {
    return currentUser;
}

export function initializeAuth(onUserAuthenticated, onUserSignedOut) {
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    const logoutBtn = document.getElementById('logout-btn');

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            authContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
            if (onUserAuthenticated) {
                await onUserAuthenticated(user);
            }
        } else {
            currentUser = null;
            authContainer.classList.remove('hidden');
            appContainer.classList.add('hidden');
            if (onUserSignedOut) {
                await onUserSignedOut();
            }
        }
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        signInWithEmailAndPassword(auth, email, password)
            .catch(error => showNotification(error.message, 'error'));
    });

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        createUserWithEmailAndPassword(auth, email, password)
             .then(userCredential => {
                const user = userCredential.user;
                // Add user to the 'users' collection in Firestore
                addDoc(collection(db, `users/${user.uid}/users`), {
                    email: user.email,
                    name: user.email.split('@')[0] // Default name from email
                });
            })
            .catch(error => showNotification(error.message, 'error'));
    });

    logoutBtn.addEventListener('click', () => signOut(auth));

    showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-view').classList.add('hidden');
        document.getElementById('register-view').classList.remove('hidden');
    });

    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-view').classList.remove('hidden');
        document.getElementById('register-view').classList.add('hidden');
    });
}
