import { auth, db } from './firebase.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
    collection,
    addDoc,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { setLanguage } from './utils/i18n.js';

let currentUser = null;

export function getCurrentUser() {
    return currentUser;
}

export function initAuth(loginCallback) {
    onAuthStateChanged(auth, async (user) => {
        const authContainer = document.getElementById('auth-container');
        const appContainer = document.getElementById('app-container');

        if (user) {
            currentUser = user;
            authContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
            loginCallback();
        } else {
            currentUser = null;
            authContainer.classList.remove('hidden');
            appContainer.classList.add('hidden');
            await setLanguage(navigator.language.split('-')[0] || 'es');
        }
    });
}

export function setupAuthForms() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    const logoutBtn = document.getElementById('logout-btn');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        signInWithEmailAndPassword(auth, email, password)
            .catch(error => alert(error.message));
    });

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        createUserWithEmailAndPassword(auth, email, password)
            .then(userCredential => {
                const user = userCredential.user;
                // Add user to the 'users' collection
                addDoc(collection(db, `users/${user.uid}/users`), {
                    email: user.email,
                    name: user.email.split('@')[0]
                });
            })
            .catch(error => alert(error.message));
    });

    logoutBtn.addEventListener('click', () => signOut(auth));

    showRegister.addEventListener('click', () => {
        document.getElementById('login-view').classList.add('hidden');
        document.getElementById('register-view').classList.remove('hidden');
    });

    showLogin.addEventListener('click', () => {
        document.getElementById('login-view').classList.remove('hidden');
        document.getElementById('register-view').classList.add('hidden');
    });
}
