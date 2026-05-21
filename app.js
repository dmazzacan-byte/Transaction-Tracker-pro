// --- Promise Timeout Utility ---
/**
 * Wraps a promise with a timeout.
 * @param {Promise} promise The promise to wrap.
 * @param {number} ms The timeout in milliseconds.
 * @param {string} timeoutError The error message to throw on timeout.
 * @returns {Promise} A new promise that rejects on timeout.
 */
function promiseWithTimeout(promise, ms, timeoutError = 'La operación ha tardado demasiado en responder.') {
    // Create a new promise that rejects in `ms` milliseconds
    const timeout = new Promise((_, reject) => {
        const id = setTimeout(() => {
            clearTimeout(id);
            reject(new Error(timeoutError));
        }, ms);
    });

    // Race the input promise against the timeout
    return Promise.race([
        promise,
        timeout
    ]);
}
// --- End Utility ---

import { login, logout, monitorAuthState } from './firebase.js';
import { initProducts } from './products.js';
import { initCustomers } from './customers.js';
import { initOrders } from './orders.js';
import { initPayments } from './payments.js';
import { initDashboard } from './dashboard.js';
import { initSettings } from './settings.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app');
    const loginError = document.getElementById('login-error');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');

    // Monitor auth state
    monitorAuthState(async (user) => {
        if (user) {
            try {
                // When user is authenticated, hide login and show the main app
                loginContainer.style.display = 'none';
                appContainer.style.display = 'flex';
                // Initialize all application modules
                initProducts();
                initCustomers();
                initOrders();
                initPayments();
                initDashboard();
                initSettings();
            } catch (error) {
                // If any initialization fails, log the user out and show an error
                console.error("Failed to initialize application after login:", error);
                loginError.textContent = "Error al cargar los datos de la aplicación. Inténtalo de nuevo.";
                await logout(); // Ensure user is logged out to prevent inconsistent state
            }
        } else {
            // If user is not authenticated, show the login screen
            loginContainer.style.display = 'flex';
            appContainer.style.display = 'none';
        }
        // The UI initialization for a new login is now handled directly by the login button's click event.
    });

    // Login event
    loginButton.addEventListener('click', async () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Provide user feedback
        loginError.textContent = '';
        loginButton.disabled = true;
        loginButton.textContent = 'Logging in...';

        try {
            await login(email, password);
            // Auth state change will handle UI update
        } catch (error) {
            console.error('Login failed:', error);
            // Provide specific error messages
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    loginError.textContent = 'Correo electrónico o contraseña incorrectos.';
                    break;
                case 'auth/invalid-email':
                    loginError.textContent = 'El formato del correo electrónico es inválido.';
                    break;
                default:
                    loginError.textContent = 'Ocurrió un error durante el inicio de sesión.';
            }
        } finally {
            // Re-enable the button
            loginButton.disabled = false;
            loginButton.textContent = 'Login';
        }
    });

    // Logout event
    logoutButton.addEventListener('click', async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    });

    // Navigation logic
    const navLinks = document.querySelectorAll('.nav-links a');
    const contentSections = document.querySelectorAll('.content-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            navLinks.forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');

            const sectionId = e.target.getAttribute('data-section');

            contentSections.forEach(section => {
                section.style.display = (section.id === sectionId) ? 'block' : 'none';
            });
        });
    });
});
