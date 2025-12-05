import { auth, db } from './firebase.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
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


document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let currentUser = null;
    let listenersAttached = false;
    let products = [];
    let customers = [];
    let orders = [];
    let payments = [];
    let users = [];
    let translations = {}; // Initialize translations object

    // --- DOM Elements ---
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const menuToggle = document.getElementById('menu-toggle');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    const logoutBtn = document.getElementById('logout-btn');

    const navLinks = document.querySelectorAll('.nav-link');
    const tabs = document.querySelectorAll('.tab-content');

    // Modals & Forms
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modals = document.querySelectorAll('.modal');

    // Add Buttons
    const addProductBtn = document.getElementById('add-product-btn');
    const addCustomerBtn = document.getElementById('add-customer-btn');
    const addOrderBtn = document.getElementById('add-order-btn');
    const addPaymentBtn = document.getElementById('add-payment-btn');

    // Tables
    const productsTableBody = document.getElementById('products-table-body');
    const customersTableBody = document.getElementById('customers-table-body');
    const ordersTableBody = document.getElementById('orders-table-body');
    const paymentsTableBody = document.getElementById('payments-table-body');
    const usersTableBody = document.getElementById('users-table-body');

    // Search & Filters
    const ordersSearch = document.getElementById('orders-search');
    const customersSearch = document.getElementById('customers-search');
    const productsSearch = document.getElementById('products-search');
    const ordersCustomerFilter = document.getElementById('orders-customer-filter');
    const ordersMonthFilter = document.getElementById('orders-month-filter');
    const ordersYearFilter = document.getElementById('orders-year-filter');
    const paymentsCustomerFilter = document.getElementById('payments-customer-filter');
    const paymentsMonthFilter = document.getElementById('payments-month-filter');
    const paymentsYearFilter = document.getElementById('payments-year-filter');

    // Forms
    const productForm = document.getElementById('product-form');
    const customerForm = document.getElementById('customer-form');
    const orderForm = document.getElementById('order-form');
    const paymentForm = document.getElementById('payment-form');

    // Settings
    const backupBtn = document.getElementById('backup-data-btn');
    const restoreBtn = document.getElementById('restore-data-btn');
    const restoreInput = document.getElementById('restore-data-input');

    // Dashboard
    const dashboardMonthSelect = document.getElementById('dashboard-month');
    const dashboardYearSelect = document.getElementById('dashboard-year');
    const pendingOrdersList = document.getElementById('pending-orders-list');
    let salesChart, productSalesChart, customerRankingChart;

    // --- I18n ---
    async function setLanguage(lang = 'es') { // Default to Spanish
        try {
            const response = await fetch(`locales/${lang}.json`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            translations = await response.json();
            translateUI();
        } catch (error) {
            console.error("Could not load language file:", error);
            // Fallback to English if Spanish fails
            if (lang !== 'en') {
                await setLanguage('en');
            }
        }
    }

    function t(key, options = {}) {
        let translation = translations[key] || key;
        // Replace placeholders like {{variable}}
        Object.keys(options).forEach(placeholder => {
            const regex = new RegExp(`{{${placeholder}}}`, 'g');
            translation = translation.replace(regex, options[placeholder]);
        });
        return translation;
    }

    function translateUI() {
        document.querySelectorAll('[data-i18n-key]').forEach(el => {
            const key = el.dataset.i18nKey;
            const translation = t(key);
            // Use .childNodes to avoid breaking event listeners on child elements
            const textNode = Array.from(el.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
            if (textNode) {
                textNode.textContent = translation;
            } else if (el.firstChild && el.firstChild.nodeType !== Node.ELEMENT_NODE) {
                el.textContent = translation;
            } else if (!el.children.length) { // Only set textContent if no children exist
                el.textContent = translation;
            }
        });
         document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.dataset.i18nPlaceholder;
            el.placeholder = t(key);
        });
    }

    // --- Authentication ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            authContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
            await initApp();
        } else {
            currentUser = null;
            authContainer.classList.remove('hidden');
            appContainer.classList.add('hidden');
            await setLanguage(navigator.language.split('-')[0] || 'es');
        }
    });

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

    const sidebar = document.querySelector('.sidebar');
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('show');
    });

    // Hide sidebar after clicking a nav link on mobile
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('show');
            }
        });
    });

    function setupOrderFilters() {
        populateSelect('orders-customer-filter', [{id: '', name: t('all_customers')}, ...customers], 'id', 'name');

        const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        ordersMonthFilter.innerHTML = `<option value="">${t('all_months')}</option>` + months.map((m, i) => `<option value="${i}">${m}</option>`).join('');
        ordersMonthFilter.value = new Date().getMonth();

        const currentYear = new Date().getFullYear();
        let yearOptions = `<option value="">${t('all_years')}</option>`;
        for (let i = currentYear; i >= currentYear - 5; i--) {
            yearOptions += `<option value="${i}">${i}</option>`;
        }
        ordersYearFilter.innerHTML = yearOptions;
        ordersYearFilter.value = currentYear;

        const applyFilters = () => {
            renderOrders(
                ordersSearch.value,
                ordersCustomerFilter.value,
                ordersMonthFilter.value,
                ordersYearFilter.value
            );
        };
        if (!listenersAttached) {
            ordersCustomerFilter.addEventListener('change', applyFilters);
            ordersMonthFilter.addEventListener('change', applyFilters);
            ordersYearFilter.addEventListener('change', applyFilters);
            ordersSearch.addEventListener('input', applyFilters);
        }
        applyFilters(); // Initial render
    }

    function setupPaymentFilters() {
        populateSelect('payments-customer-filter', [{id: '', name: t('all_customers')}, ...customers], 'id', 'name');

        const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        paymentsMonthFilter.innerHTML = `<option value="">${t('all_months')}</option>` + months.map((m, i) => `<option value="${i}">${m}</option>`).join('');
        paymentsMonthFilter.value = new Date().getMonth();

        const currentYear = new Date().getFullYear();
        let yearOptions = `<option value="">${t('all_years')}</option>`;
        for (let i = currentYear; i >= currentYear - 5; i--) {
            yearOptions += `<option value="${i}">${i}</option>`;
        }
        paymentsYearFilter.innerHTML = yearOptions;
        paymentsYearFilter.value = currentYear;

        const applyFilters = () => {
            renderPayments(
                paymentsCustomerFilter.value,
                paymentsMonthFilter.value,
                paymentsYearFilter.value
            );
        };
        if (!listenersAttached) {
            paymentsCustomerFilter.addEventListener('change', applyFilters);
            paymentsMonthFilter.addEventListener('change', applyFilters);
            paymentsYearFilter.addEventListener('change', applyFilters);
        }
        applyFilters(); // Initial render
    }

    // --- App Initialization ---
    async function initApp() {
        if (!currentUser) return;
        await setLanguage('es'); // Default to Spanish
        await fetchData();
        renderAll();
        setupDashboard();
        setupOrderFilters();
        setupPaymentFilters();
        if (!listenersAttached) {
            customersSearch.addEventListener('input', () => renderCustomers(customersSearch.value));
            productsSearch.addEventListener('input', () => renderProducts(productsSearch.value));
            listenersAttached = true;
        }

        translateUI();
        document.body.dataset.ready = 'true';
    }

    // --- Data Fetching ---
    async function fetchData() {
        try {
            const userId = currentUser.uid;
            const collections = {
                products: collection(db, `users/${userId}/products`),
                customers: collection(db, `users/${userId}/customers`),
                orders: collection(db, `users/${userId}/orders`),
                payments: collection(db, `users/${userId}/payments`),
                users: collection(db, `users/${userId}/users`)
            };

            const [productsSnap, customersSnap, ordersSnap, paymentsSnap, usersSnap] = await Promise.all([
                getDocs(collections.products),
                getDocs(collections.customers),
                getDocs(collections.orders),
                getDocs(collections.payments),
                getDocs(collections.users)
            ]);

            products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            customers = customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            orders = ordersSnap.docs.map(doc => {
                const order = { id: doc.id, ...doc.data() };
                // Backwards compatibility for old data structure
                if (order.productId && !order.items) {
                    order.items = [{
                        productId: order.productId,
                        quantity: order.quantity,
                        price: order.total / order.quantity,
                        priceType: 'retail' // Assume retail for old orders
                    }];
                }
                return order;
            });
            payments = paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error fetching data:", error);
            alert(`Error fetching data: ${error.message}`);
        }
    }

    // --- Rendering ---
    function renderAll() {
        renderProducts();
        renderCustomers();
        renderOrders();
        renderPayments();
        renderUsers();
    }

    function renderProducts(searchTerm = '') {
        productsTableBody.innerHTML = '';
        const filteredProducts = products.filter(p => p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
        filteredProducts.sort((a, b) => (a.description || '').localeCompare(b.description || ''));
        filteredProducts.forEach(p => {
            const retailPrice = typeof p.retailPrice === 'number' ? p.retailPrice.toFixed(2) : '0.00';
            const wholesalePrice = typeof p.wholesalePrice === 'number' ? p.wholesalePrice.toFixed(2) : '0.00';
            const row = `
                <tr>
                    <td>${p.description || 'N/A'}</td>
                    <td>$${retailPrice}</td>
                    <td>$${wholesalePrice}</td>
                    <td>
                        <button class="action-btn edit" data-id="${p.id}" data-type="product" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete" data-id="${p.id}" data-type="product" title="Delete"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
            productsTableBody.innerHTML += row;
        });
    }

     function renderCustomers(searchTerm = '') {
        customersTableBody.innerHTML = '';
        if (!customers) return;

        const filteredCustomers = customers.filter(c => c && c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase()));
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        // Sort alphabetically by name
        filteredCustomers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        filteredCustomers.forEach(c => {
            const customerOrders = orders ? orders.filter(o => o && o.customerId === c.id) : [];

            const historicalVolume = customerOrders.reduce((sum, o) => {
                const total = parseFloat(o.total);
                return sum + (isNaN(total) ? 0 : total);
            }, 0);

            const monthlyVolume = customerOrders
                .filter(o => {
                    if (!o.date) return false;
                    const orderDate = new Date(o.date);
                    // Check for valid date
                    return !isNaN(orderDate.getTime()) && orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
                })
                .reduce((sum, o) => {
                    const total = parseFloat(o.total);
                    return sum + (isNaN(total) ? 0 : total);
                }, 0);

            const pendingAmount = customerOrders
                .filter(o => o.status !== 'Paid')
                .reduce((sum, o) => {
                    const total = parseFloat(o.total) || 0;
                    const amountPaid = parseFloat(o.amountPaid) || 0;
                    return sum + (total - amountPaid);
                }, 0);

            const row = `
                <tr>
                    <td>${c.name || 'N/A'}</td>
                    <td>${c.phone || ''}</td>
                    <td>$${(monthlyVolume || 0).toFixed(2)}</td>
                    <td>$${(historicalVolume || 0).toFixed(2)}</td>
                    <td>$${(pendingAmount || 0).toFixed(2)}</td>
                    <td>
                        <button class="action-btn edit" data-id="${c.id}" data-type="customer" title="${t('edit')}"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete" data-id="${c.id}" data-type="customer" title="${t('delete')}"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
            customersTableBody.innerHTML += row;
        });
    }

    function renderOrders(searchTerm = '', customerId, month, year) {
        ordersTableBody.innerHTML = '';
        if (!orders) return;

        let filteredOrders = orders.filter(o => {
            if (!o || !o.date) return false;
            const orderDate = new Date(o.date);
            return !isNaN(orderDate.getTime());
        });

        if (customerId) {
            filteredOrders = filteredOrders.filter(o => o.customerId === customerId);
        }
        if (month) {
            filteredOrders = filteredOrders.filter(o => new Date(o.date).getMonth() == month);
        }
        if (year) {
            filteredOrders = filteredOrders.filter(o => new Date(o.date).getFullYear() == year);
        }
        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            filteredOrders = filteredOrders.filter(o => {
                const customerName = (customers.find(c => c && c.id === o.customerId)?.name || '').toLowerCase();
                const items = Array.isArray(o.items) ? o.items : [];
                const itemSummary = items.map(item => {
                    const product = products.find(p => p && p.id === item.productId);
                    return product ? (product.description || '').toLowerCase() : '';
                }).join(' ');
                return customerName.includes(lowerCaseSearchTerm) || itemSummary.includes(lowerCaseSearchTerm);
            });
        }

        filteredOrders.sort((a, b) => new Date(b.date) - new Date(a.date));

        filteredOrders.forEach(o => {
            const customer = customers.find(c => c && c.id === o.customerId)?.name || 'N/A';
            const items = Array.isArray(o.items) ? o.items : [];
            const itemsSummary = items.map(item => {
                const product = products.find(p => p && p.id === item.productId);
                const quantity = parseInt(item.quantity) || 0;
                return `${quantity} x ${product ? (product.description || 'N/A') : 'N/A'}`;
            }).join('<br>');

            const status = o.status || 'N/A';
            const statusClass = `status-${status.toLowerCase()}`;
            const totalQuantity = items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
            const total = parseFloat(o.total);
            const amountPaid = parseFloat(o.amountPaid);

            const row = `
                <tr>
                    <td>${new Date(o.date).toLocaleDateString()}</td>
                    <td>${customer}</td>
                    <td>${itemsSummary}</td>
                    <td>${totalQuantity}</td>
                    <td>$${!isNaN(total) ? total.toFixed(2) : '0.00'}</td>
                    <td>$${!isNaN(amountPaid) ? amountPaid.toFixed(2) : '0.00'}</td>
                    <td><span class="status ${statusClass}">${t(status.toLowerCase())}</span></td>
                    <td>
                        <button class="action-btn edit" data-id="${o.id}" data-type="order" title="${t('edit')}"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete" data-id="${o.id}" data-type="order" title="${t('delete')}"><i class="fas fa-trash"></i></button>
                        <button class="action-btn pay" data-id="${o.id}" data-type="order" title="${t('pay')}"><i class="fas fa-dollar-sign"></i></button>
                        <button class="action-btn whatsapp-btn"
                                data-customer-id="${o.customerId}"
                                data-amount="${(total - amountPaid).toFixed(2)}"
                                title="Send WhatsApp Reminder">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                    </td>
                </tr>
            `;
            ordersTableBody.innerHTML += row;
        });
    }

    function renderPayments(customerId, month, year) {
        paymentsTableBody.innerHTML = '';
        if (!payments) return;

        let filteredPayments = payments.filter(p => {
            if (!p || !p.date) return false;
            const paymentDate = new Date(p.date);
            return !isNaN(paymentDate.getTime());
        });

        if (customerId) {
            const customerOrders = orders.filter(o => o.customerId === customerId).map(o => o.id);
            filteredPayments = filteredPayments.filter(p => customerOrders.includes(p.orderId));
        }
        if (month) {
            filteredPayments = filteredPayments.filter(p => new Date(p.date).getMonth() == month);
        }
        if (year) {
            filteredPayments = filteredPayments.filter(p => new Date(p.date).getFullYear() == year);
        }

        filteredPayments.sort((a, b) => new Date(b.date) - new Date(a.date));

        filteredPayments.forEach(p => {
            const order = orders.find(o => o && o.id === p.orderId);
            const customer = customers.find(c => c && c.id === order?.customerId)?.name || 'N/A';
            const orderId = order ? `Order #${order.id.substring(0, 5)}...` : 'N/A';
            const amount = parseFloat(p.amount);

            const row = `
                <tr>
                    <td>${new Date(p.date).toLocaleDateString()}</td>
                    <td>${customer}</td>
                    <td>${orderId}</td>
                    <td>$${!isNaN(amount) ? amount.toFixed(2) : '0.00'}</td>
                    <td>${p.reference || ''}</td>
                    <td>
                        <button class="action-btn edit" data-id="${p.id}" data-type="payment" title="${t('edit')}"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete" data-id="${p.id}" data-type="payment" title="${t('delete')}"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
            paymentsTableBody.innerHTML += row;
        });
    }

    function renderUsers() {
        usersTableBody.innerHTML = '';
        users.forEach(u => {
            const row = `
                <tr>
                    <td>${u.name || u.email.split('@')[0]}</td>
                    <td>${u.email}</td>
                    <td>
                         <button class="action-btn delete" data-id="${u.id}" data-type="user" title="Delete"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
            usersTableBody.innerHTML += row;
        });
    }

    // --- Modals ---
    let onModalClose = null;
    function openModal(modalId, callback = null) {
        document.getElementById(modalId).classList.remove('hidden');
        modalBackdrop.classList.remove('hidden');
        onModalClose = callback;
    }

    function closeModal() {
        modals.forEach(m => m.classList.add('hidden'));
        modalBackdrop.classList.add('hidden');
        if (onModalClose) {
            onModalClose();
            onModalClose = null;
        }
    }

    modalBackdrop.addEventListener('click', closeModal);
    modals.forEach(m => m.querySelector('.close-btn').addEventListener('click', closeModal));

    // --- Event Listeners for Add Buttons ---
    addProductBtn.addEventListener('click', () => {
        productForm.reset();
        document.getElementById('product-id').value = '';
        document.getElementById('product-modal-title').textContent = t('new_product');
        openModal('product-modal');
    });

    addCustomerBtn.addEventListener('click', () => {
        customerForm.reset();
        document.getElementById('customer-id').value = '';
        document.getElementById('customer-modal-title').textContent = t('new_customer');
        openModal('customer-modal');
    });

    addOrderBtn.addEventListener('click', () => {
        orderForm.reset();
        document.getElementById('order-items-container').innerHTML = '';
        document.getElementById('order-id').value = '';
        document.getElementById('order-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('order-payment-details').classList.add('hidden');
        setupCustomerAutocomplete();
        addOrderItem();
        updateOrderTotal();
        document.getElementById('order-modal-title').textContent = t('new_order');
        openModal('order-modal');
    });

    document.getElementById('order-status').addEventListener('change', (e) => {
        const paymentDetails = document.getElementById('order-payment-details');
        if (e.target.value === 'Paid' || e.target.value === 'Partial') {
            paymentDetails.classList.remove('hidden');
        } else {
            paymentDetails.classList.add('hidden');
        }
    });

    document.getElementById('add-customer-from-order-btn').addEventListener('click', () => {
        document.getElementById('order-modal').classList.add('hidden');
        openModal('customer-modal', (newCustomerId) => {
            document.getElementById('order-modal').classList.remove('hidden');
            const newCustomer = customers.find(c => c.id === newCustomerId);
            if (newCustomer) {
                document.getElementById('order-customer-search').value = newCustomer.name;
                document.getElementById('order-customer-id').value = newCustomer.id;
            }
        });
    });

    document.getElementById('add-item-btn').addEventListener('click', addOrderItem);

    addPaymentBtn.addEventListener('click', () => {
        paymentForm.reset();
        document.getElementById('payment-date').value = new Date().toISOString().split('T')[0];

        // Populate customer dropdown
        const sortedCustomers = [...customers].sort((a, b) => a.name.localeCompare(b.name));
        populateSelect('payment-customer', sortedCustomers, 'id', 'name');

        // Reset and disable order dropdown
        const paymentOrderSelect = document.getElementById('payment-order');
        paymentOrderSelect.innerHTML = '<option value="">' + t('select_customer_first') + '</option>';
        paymentOrderSelect.disabled = true;

        document.getElementById('payment-modal-title').textContent = t('new_payment');
        openModal('payment-modal');
    });

    document.getElementById('payment-customer').addEventListener('change', (e) => {
        const customerId = e.target.value;
        const paymentOrderSelect = document.getElementById('payment-order');
        const paymentAmountInput = document.getElementById('payment-amount');

        if (!customerId) {
            paymentOrderSelect.innerHTML = '<option value="">' + t('select_customer_first') + '</option>';
            paymentOrderSelect.disabled = true;
            paymentAmountInput.value = '';
            return;
        }

        const pendingOrders = orders.filter(o => o.customerId === customerId && o.status !== 'Paid' && o.total > (o.amountPaid || 0));

        if (pendingOrders.length === 0) {
            paymentOrderSelect.innerHTML = '<option value="">' + t('no_pending_orders') + '</option>';
            paymentOrderSelect.disabled = true;
            return;
        }

        paymentOrderSelect.innerHTML = '<option value="">' + t('select_an_order') + '</option>';
        pendingOrders.forEach(o => {
            const balanceDue = o.total - (o.amountPaid || 0);
            const option = document.createElement('option');
            option.value = o.id;
            option.textContent = `Order of ${new Date(o.date).toLocaleDateString()} - Total: $${o.total.toFixed(2)}, Pending: $${balanceDue.toFixed(2)}`;
            option.dataset.balance = balanceDue.toFixed(2);
            paymentOrderSelect.appendChild(option);
        });

        paymentOrderSelect.disabled = false;
    });

    document.getElementById('payment-order').addEventListener('change', (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const balance = selectedOption.dataset.balance;
        document.getElementById('payment-amount').value = balance || '';
    });


    function addOrderItem(item = {}) {
        const container = document.getElementById('order-items-container');
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('item');

        const sortedProducts = [...products].sort((a, b) => a.description.localeCompare(b.description));
        const productOptions = sortedProducts.map(p => `<option value="${p.id}" ${p.id === item.productId ? 'selected' : ''}>${p.description}</option>`).join('');

        itemDiv.innerHTML = `
            <select class="item-product" required>${productOptions}</select>
            <input type="number" class="item-quantity" value="${item.quantity || 1}" min="1" required>
            <select class="item-price-type">
                <option value="retail" ${item.priceType === 'retail' ? 'selected' : ''}>${t('retail_price')}</option>
                <option value="wholesale" ${item.priceType === 'wholesale' ? 'selected' : ''}>${t('wholesale_price')}</option>
            </select>
            <button type="button" class="action-btn delete remove-item-btn"><i class="fas fa-trash"></i></button>
        `;

        container.appendChild(itemDiv);

        itemDiv.querySelector('.remove-item-btn').addEventListener('click', () => {
            itemDiv.remove();
            updateOrderTotal();
        });

        itemDiv.querySelector('.item-product').addEventListener('change', updateOrderTotal);
        itemDiv.querySelector('.item-quantity').addEventListener('input', updateOrderTotal);
        itemDiv.querySelector('.item-price-type').addEventListener('change', updateOrderTotal);
    }

    function updateOrderTotal() {
        let total = 0;
        document.querySelectorAll('#order-items-container .item').forEach(itemDiv => {
            const productId = itemDiv.querySelector('.item-product').value;
            const quantity = parseInt(itemDiv.querySelector('.item-quantity').value);
            const priceType = itemDiv.querySelector('.item-price-type').value;
            const product = products.find(p => p.id === productId);

            if (product && quantity > 0) {
                const price = priceType === 'wholesale' ? product.wholesalePrice : product.retailPrice;
                total += price * quantity;
            }
        });
        document.getElementById('order-total-display').textContent = `$${total.toFixed(2)}`;
    }

    function setupCustomerAutocomplete() {
        const searchInput = document.getElementById('order-customer-search');
        const resultsContainer = document.getElementById('customer-autocomplete-results');
        const customerIdInput = document.getElementById('order-customer-id');

        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            if (!searchTerm) {
                resultsContainer.innerHTML = '';
                customerIdInput.value = '';
                return;
            }
            const filtered = customers.filter(c => c.name.toLowerCase().includes(searchTerm));
            resultsContainer.innerHTML = '';
            filtered.forEach(customer => {
                const div = document.createElement('div');
                div.textContent = customer.name;
                div.addEventListener('click', () => {
                    searchInput.value = customer.name;
                    customerIdInput.value = customer.id;
                    resultsContainer.innerHTML = '';
                });
                resultsContainer.appendChild(div);
            });
        });

        document.addEventListener('click', (e) => {
            if (!resultsContainer.contains(e.target) && e.target !== searchInput) {
                resultsContainer.innerHTML = '';
            }
        });
    }

    // --- Form Submissions ---
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('product-id').value;
        const data = {
            description: document.getElementById('product-description').value,
            retailPrice: parseFloat(document.getElementById('product-retail-price').value) || 0,
            wholesalePrice: parseFloat(document.getElementById('product-wholesale-price').value) || 0,
        };

        await saveOrUpdate('products', id, data);
        closeModal();
        await initApp();
    });

    customerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('customer-id').value;
        const data = {
            name: document.getElementById('customer-name').value,
            phone: document.getElementById('customer-phone').value,
        };
        const newCustomerId = await saveOrUpdate('customers', id, data);
        await fetchData(); // Fetch latest customers to ensure the new one is available

        if (onModalClose) {
            // First, manually close the customer modal
            document.getElementById('customer-modal').classList.add('hidden');

            // Then, execute the callback which will re-open the order modal
            onModalClose(newCustomerId || id);
            onModalClose = null; // Clear callback
        } else {
            // Standard behavior when not opened from another modal
            closeModal();
        }
        await renderCustomers(); // Re-render customer list in the background
    });

    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('order-id').value;

        const items = [];
        let total = 0;
        document.querySelectorAll('#order-items-container .item').forEach(itemDiv => {
            const productId = itemDiv.querySelector('.item-product').value;
            const quantity = parseInt(itemDiv.querySelector('.item-quantity').value);
            const priceType = itemDiv.querySelector('.item-price-type').value;
            const product = products.find(p => p.id === productId);

            if (product && quantity > 0) {
                const price = priceType === 'wholesale' ? product.wholesalePrice : product.retailPrice;
                items.push({ productId, quantity, priceType, price });
                total += price * quantity;
            }
        });

        const status = document.getElementById('order-status').value;
        const amountPaidInput = document.getElementById('order-amount-paid');
        const bankReferenceInput = document.getElementById('order-bank-reference');

        let amountPaid = 0;
        if (status === 'Paid') {
            amountPaid = total;
        } else if (status === 'Partial') {
            amountPaid = parseFloat(amountPaidInput.value) || 0;
        }

        const dateParts = document.getElementById('order-date').value.split('-');
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
        const day = parseInt(dateParts[2], 10);
        const localDate = new Date(year, month, day);

        const data = {
            customerId: document.getElementById('order-customer-id').value,
            items: items,
            total: total,
            status: status,
            amountPaid: amountPaid,
            date: localDate.toISOString()
        };

        const orderId = await saveOrUpdate('orders', id, data);

        // If a payment was made, create a corresponding payment record
        if (amountPaid > 0) {
            const paymentData = {
                orderId: orderId,
                amount: amountPaid,
                reference: bankReferenceInput.value,
                date: data.date
            };
            await addDoc(collection(db, `users/${currentUser.uid}/payments`), paymentData);
        }

        closeModal();
        await initApp();
    });

     paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('payment-id').value;
        const orderId = document.getElementById('payment-order').value || document.getElementById('payment-order-id').value;
        const amount = parseFloat(document.getElementById('payment-amount').value);

        const dateParts = document.getElementById('payment-date').value.split('-');
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const day = parseInt(dateParts[2], 10);
        const localDate = new Date(year, month, day);

        const data = {
            orderId: orderId,
            amount: amount,
            reference: document.getElementById('payment-reference').value,
            date: localDate.toISOString()
        };

        await saveOrUpdate('payments', id, data);
        await updateOrderPaymentStatus(orderId);

        closeModal();
        await initApp();
    });

    async function updateOrderPaymentStatus(orderId) {
        if (!orderId) return;

        // Re-fetch all payments for the order to ensure data is current
        const paymentsForOrderSnap = await getDocs(query(collection(db, `users/${currentUser.uid}/payments`), where("orderId", "==", orderId)));
        const paymentsForOrder = paymentsForOrderSnap.docs.map(doc => doc.data());

        const totalPaid = paymentsForOrder.reduce((sum, p) => sum + (p.amount || 0), 0);

        const order = orders.find(o => o.id === orderId);
        if (order) {
            const newStatus = totalPaid >= order.total ? 'Paid' : (totalPaid > 0 ? 'Partial' : 'Pending');
            const orderRef = doc(db, `users/${currentUser.uid}/orders`, orderId);
            await updateDoc(orderRef, { amountPaid: totalPaid, status: newStatus });
        }
    }

    async function saveOrUpdate(collectionName, id, data) {
        const collectionRef = collection(db, `users/${currentUser.uid}/${collectionName}`);
        if (id) {
            await updateDoc(doc(collectionRef, id), data);
            return id;
        } else {
            const newDocRef = await addDoc(collectionRef, data);
            return newDocRef.id;
        }
    }

    // --- Edit and Delete ---
    document.querySelector('.main-content').addEventListener('click', async (e) => {
        const target = e.target.closest('.action-btn');
        if (!target) return;

        const id = target.dataset.id;
        const type = target.dataset.type;

        if (target.classList.contains('edit')) {
            handleEdit(id, type);
        } else if (target.classList.contains('delete')) {
            if (confirm(`Are you sure you want to delete this ${type}?`)) {
                await deleteDoc(doc(db, `users/${currentUser.uid}/${type}s`, id));
                await initApp();
            }
        } else if (target.classList.contains('pay')) {
             const order = orders.find(o => o.id === id);
             paymentForm.reset();
             document.getElementById('payment-order-id').value = id;
             // Disable order select
             const paymentOrderSelect = document.getElementById('payment-order');
             paymentOrderSelect.innerHTML = `<option value="${id}">Order #${id.substring(0,5)}</option>`;
             paymentOrderSelect.disabled = true;

             const remaining = order.total - (order.amountPaid || 0);
             document.getElementById('payment-amount').value = remaining.toFixed(2);
             document.getElementById('payment-modal-title').textContent = 'Register Payment';
             openModal('payment-modal');
        } else if (target.classList.contains('whatsapp-btn')) {
            const customerId = target.dataset.customerId;
            const orderId = target.closest('tr')?.querySelector('.edit')?.dataset.id;
            const customer = customers.find(c => c.id === customerId);

            if (customer && customer.phone) {
                let message;
                // Check if the button is inside the orders table
                if (orderId && target.closest('#orders-table-body')) {
                    const order = orders.find(o => o.id === orderId);
                    if (order) {
                        const orderDate = new Date(order.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' }).replace('.', '');
                        message = `Entregado ${orderDate}:\n\n`;

                        const itemLines = order.items.map(item => {
                            const product = products.find(p => p.id === item.productId);
                            const price = item.priceType === 'wholesale' ? product.wholesalePrice : product.retailPrice;
                            const itemTotal = item.quantity * price;
                            return `• ${item.quantity} x ${product.description} x ${price.toFixed(2)}$ = ${itemTotal.toFixed(2)}$`;
                        });

                        message += itemLines.join('\n');
                        message += `\n--------------------\nTotal: ${order.total.toFixed(2)}$`;
                    }
                } else {
                    // Fallback for pending payments or other contexts
                    const amount = target.dataset.amount;
                    const daysOld = target.dataset.daysOld;
                    message = `Hola, espero que estés muy bien, te recuerdo que tienes un pago pendiente por $${amount} y han transcurrido ${daysOld} días desde la entrega del pedido.`;
                }

                const whatsappUrl = `https://wa.me/${customer.phone}?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
            } else {
                alert('Este cliente no tiene un número de teléfono registrado.');
            }
        }
    });

    function handleEdit(id, type) {
        let item;
        switch(type) {
            case 'product':
                item = products.find(i => i.id === id);
                if (!item) return;
                document.getElementById('product-id').value = item.id;
                document.getElementById('product-description').value = item.description;
                document.getElementById('product-retail-price').value = item.retailPrice;
                document.getElementById('product-wholesale-price').value = item.wholesalePrice;
                document.getElementById('product-modal-title').textContent = t('edit_product');
                openModal('product-modal');
                break;
            case 'customer':
                item = customers.find(i => i.id === id);
                if (!item) return;
                document.getElementById('customer-id').value = item.id;
                document.getElementById('customer-name').value = item.name;
                document.getElementById('customer-phone').value = item.phone;
                document.getElementById('customer-modal-title').textContent = t('edit_customer');
                openModal('customer-modal');
                break;
            case 'order':
                item = orders.find(i => i.id === id);
                if (!item) return;

                document.getElementById('order-id').value = item.id;
                document.getElementById('order-date').value = new Date(item.date).toISOString().split('T')[0];

                const customer = customers.find(c => c.id === item.customerId);
                if (customer) {
                    document.getElementById('order-customer-search').value = customer.name;
                    document.getElementById('order-customer-id').value = customer.id;
                }

                document.getElementById('order-items-container').innerHTML = '';
                item.items.forEach(orderItem => addOrderItem(orderItem));
                updateOrderTotal();

                document.getElementById('order-status').value = item.status;
                document.getElementById('order-modal-title').textContent = t('edit_order');
                openModal('order-modal');
                break;
            case 'payment':
                item = payments.find(i => i.id === id);
                if (!item) return;
                document.getElementById('payment-id').value = item.id;
                document.getElementById('payment-date').value = new Date(item.date).toISOString().split('T')[0];
                document.getElementById('payment-amount').value = item.amount;
                document.getElementById('payment-reference').value = item.reference;

                // Set customer and order
                const order = orders.find(o => o.id === item.orderId);
                if (order) {
                    populateSelect('payment-customer', customers, 'id', 'name', order.customerId);

                    const paymentOrderSelect = document.getElementById('payment-order');
                    paymentOrderSelect.innerHTML = `<option value="${order.id}">Order of ${new Date(order.date).toLocaleDateString()}</option>`;
                    paymentOrderSelect.disabled = false; // Ensure it is enabled
                }

                document.getElementById('payment-modal-title').textContent = t('edit_payment');
                openModal('payment-modal');
                break;
        }
    }


    // --- Navigation ---
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.dataset.tab;

            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            tabs.forEach(t => t.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');

            if (tabId === 'dashboard') {
                setupDashboard();
            }
        });
    });

    // --- Settings - Backup/Restore ---
    backupBtn.addEventListener('click', () => {
        const wb = XLSX.utils.book_new();
        const ws_products = XLSX.utils.json_to_sheet(products.map(({id, ...rest}) => rest));
        const ws_customers = XLSX.utils.json_to_sheet(customers.map(({id, ...rest}) => rest));
        const ws_orders = XLSX.utils.json_to_sheet(orders.map(({id, ...rest}) => rest));
        const ws_payments = XLSX.utils.json_to_sheet(payments.map(({id, ...rest}) => rest));

        XLSX.utils.book_append_sheet(wb, ws_products, "Products");
        XLSX.utils.book_append_sheet(wb, ws_customers, "Customers");
        XLSX.utils.book_append_sheet(wb, ws_orders, "Orders");
        XLSX.utils.book_append_sheet(wb, ws_payments, "Payments");

        XLSX.writeFile(wb, "backup.xlsx");
    });

    restoreBtn.addEventListener('click', () => restoreInput.click());
    restoreInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});

            if (confirm("This will overwrite existing data. Are you sure?")) {
                await restoreDataFromWorkbook(workbook);
                alert("Data restored successfully!");
                await initApp();
            }
        };
        reader.readAsArrayBuffer(file);
    });

    async function restoreDataFromWorkbook(workbook) {
        const userId = currentUser.uid;
        const sheetMap = {
            "Products": "products",
            "Customers": "customers",
            "Orders": "orders",
            "Payments": "payments"
        };

        for (const sheetName in sheetMap) {
            if (workbook.Sheets[sheetName]) {
                const collectionName = sheetMap[sheetName];
                // Clear existing data
                const existingDocs = await getDocs(collection(db, `users/${userId}/${collectionName}`));
                const deleteBatch = writeBatch(db);
                existingDocs.forEach(doc => deleteBatch.delete(doc.ref));
                await deleteBatch.commit();

                // Add new data
                const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                const addBatch = writeBatch(db);
                jsonData.forEach(item => {
                    const docRef = doc(collection(db, `users/${userId}/${collectionName}`));
                    addBatch.set(docRef, item);
                });
                await addBatch.commit();
            }
        }
    }

    // --- Dashboard ---
    function setupDashboard() {
        populateDateFilters();
        updateDashboard();
        if (!listenersAttached) {
            dashboardMonthSelect.addEventListener('change', updateDashboard);
            dashboardYearSelect.addEventListener('change', updateDashboard);
        }
    }

    function populateDateFilters() {
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const currentMonth = new Date().getMonth();
        dashboardMonthSelect.innerHTML = months.map((m, i) => `<option value="${i}" ${i === currentMonth ? 'selected' : ''}>${m}</option>`).join('');

        const currentYear = new Date().getFullYear();
        let yearOptions = '';
        for (let i = currentYear; i >= currentYear - 5; i--) {
            yearOptions += `<option value="${i}">${i}</option>`;
        }
        dashboardYearSelect.innerHTML = yearOptions;
    }

    function updateDashboard() {
        const month = parseInt(dashboardMonthSelect.value);
        const year = parseInt(dashboardYearSelect.value);

        const filteredOrders = orders.filter(o => {
            const orderDate = new Date(o.date);
            return orderDate.getMonth() === month && orderDate.getFullYear() === year;
        });

        renderSalesChart(filteredOrders, month, year);
        renderProductSalesChart(filteredOrders);
        renderPendingOrders(orders); // Show all pending, not just this month's
        renderCustomerRankingChart(filteredOrders);
    }

    function renderCustomerRankingChart(filteredOrders) {
        const customerSales = {};
        filteredOrders.forEach(o => {
            const customerName = customers.find(c => c.id === o.customerId)?.name || 'Unknown';
            customerSales[customerName] = (customerSales[customerName] || 0) + o.total;
        });

        const sortedCustomers = Object.entries(customerSales).sort(([,a],[,b]) => b-a);
        const labels = sortedCustomers.map(([name]) => name);
        const data = sortedCustomers.map(([,total]) => total);

        const ctx = document.getElementById('customer-ranking-chart').getContext('2d');
        if (customerRankingChart) customerRankingChart.destroy();
        customerRankingChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: t('sales'),
                    data: data,
                    backgroundColor: '#28a745',
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y', // Horizontal bars
            }
        });
    }

    function renderSalesChart(filteredOrders, month, year) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const salesData = new Array(daysInMonth).fill(0);

        filteredOrders.forEach(o => {
            const day = new Date(o.date).getDate();
            salesData[day - 1] += o.total;
        });

        const cumulativeSalesData = salesData.reduce((acc, val, i) => {
            acc[i] = (acc[i-1] || 0) + val;
            return acc;
        }, []);

        const ctx = document.getElementById('sales-chart').getContext('2d');
        if (salesChart) salesChart.destroy();
        salesChart = new Chart(ctx, {
            type: 'bar', // Using a mixed chart type
            data: {
                labels: labels,
                datasets: [{
                    label: t('daily_sales'),
                    data: salesData,
                    backgroundColor: 'rgba(0, 123, 255, 0.6)',
                    yAxisID: 'y',
                }, {
                    label: t('cumulative_sales'),
                    data: cumulativeSalesData,
                    type: 'line',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    backgroundColor: 'rgba(40, 167, 69, 0.2)',
                    tension: 0.1,
                    yAxisID: 'y1',
                }]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                         title: {
                            display: true,
                            text: t('daily_sales')
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: t('cumulative_sales')
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    },
                }
            }
        });
    }

    function renderProductSalesChart(filteredOrders) {
        const productSales = {};
        filteredOrders.forEach(o => {
            if (Array.isArray(o.items)) {
                o.items.forEach(item => {
                    const product = products.find(p => p.id === item.productId);
                    const productName = product ? product.description : 'Unknown';
                    const itemTotal = item.price * item.quantity;
                    productSales[productName] = (productSales[productName] || 0) + itemTotal;
                });
            }
        });

        const labels = Object.keys(productSales);
         const data = Object.values(productSales);

         const ctx = document.getElementById('product-sales-chart').getContext('2d');
         if (productSalesChart) productSalesChart.destroy();
         productSalesChart = new Chart(ctx, {
             type: 'pie',
             data: {
                 labels: labels,
                 datasets: [{
                     data: data,
                      backgroundColor: ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6c757d'],
                 }]
             },
             options: { responsive: true }
         });
    }

    function renderPendingOrders(allOrders) {
        const pendingPaymentsTableBody = document.getElementById('pending-payments-table-body');
        if (!pendingPaymentsTableBody) return;

        const pending = allOrders.filter(o => o.status !== 'Paid' && o.total > (o.amountPaid || 0));
        const totalPendingAmount = pending.reduce((sum, o) => sum + (o.total - (o.amountPaid || 0)), 0);

        // Update the card title with the total
        const pendingPaymentsCard = pendingPaymentsTableBody.closest('.card');
        if (pendingPaymentsCard) {
            pendingPaymentsCard.querySelector('h3').textContent = `${t('pending_payments')} ($${totalPendingAmount.toFixed(2)})`;
        }


        pendingPaymentsTableBody.innerHTML = '';
        if (pending.length === 0) {
            pendingPaymentsTableBody.innerHTML = `<tr><td colspan="3">${t('no_pending_payments')}</td></tr>`;
            return;
        }

        // Sort by oldest first
        pending.sort((a, b) => new Date(a.date) - new Date(b.date));

        pending.forEach(o => {
            const customerName = customers.find(c => c.id === o.customerId)?.name || 'N/A';
            const remaining = o.total - (o.amountPaid || 0);
            const orderDate = new Date(o.date);
            const daysOld = Math.floor((new Date() - orderDate) / (1000 * 60 * 60 * 24));
            const row = `
                <tr>
                    <td>${customerName}</td>
                    <td>$${remaining.toFixed(2)}</td>
                    <td>${daysOld} ${t('days_old')}</td>
                    <td>
                        <button class="action-btn whatsapp-btn"
                                data-customer-id="${o.customerId}"
                                data-customer-name="${customerName}"
                                data-amount="${remaining.toFixed(2)}"
                                data-days-old="${daysOld}"
                                title="Send WhatsApp Reminder">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                    </td>
                </tr>
            `;
            pendingPaymentsTableBody.innerHTML += row;
        });
    }

    // --- Helpers ---
    function populateSelect(selectId, data, valueKey, textKey, selectedValue) {
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Select...</option>';
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueKey];
            option.textContent = item[textKey];
            if (item[valueKey] === selectedValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }
});
