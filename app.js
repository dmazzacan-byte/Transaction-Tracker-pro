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
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutButton = document.getElementById('logout-button');

    // Monitor auth state
    monitorAuthState(user => {
        if (user) {
            loginContainer.style.display = 'none';
            appContainer.style.display = 'flex';
            initProducts();
            initCustomers();
            initOrders();
            initPayments();
            initDashboard();
            initSettings();
        } else {
            loginContainer.style.display = 'flex';
            appContainer.style.display = 'none';
        }
    });

    // Login event
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.textContent = '';
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            await login(email, password);
        } catch (error) {
            console.error('Login failed:', error);
            loginError.textContent = 'Invalid email or password.';
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
