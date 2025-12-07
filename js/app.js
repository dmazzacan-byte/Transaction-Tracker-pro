
import { db } from './firebase.js';
import { getCurrentUser, initializeAuth } from './auth.js';
import { setLanguage, showNotification, t, populateSelect, formatCurrency } from './utils.js';
import { renderUI } from './ui.js';
import {
    collection,
    doc,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    writeBatch
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let state = {
        products: [],
        customers: [],
        orders: [],
        payments: [],
        users: [],
        filters: {
            productSearch: '',
            customerSearch: '',
            orderFilters: { customerId: '', month: new Date().getMonth(), year: new Date().getFullYear() },
            paymentFilters: { customerId: '', month: new Date().getMonth(), year: new Date().getFullYear() },
        }
    };
    let listenersAttached = false;

    // --- DOM Elements ---
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.querySelectorAll('.nav-link');
    const tabs = document.querySelectorAll('.tab-content');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modals = document.querySelectorAll('.modal');

    const productForm = document.getElementById('product-form');
    const customerForm = document.getElementById('customer-form');
    const orderForm = document.getElementById('order-form');
    const paymentForm = document.getElementById('payment-form');

    const backupBtn = document.getElementById('backup-data-btn');
    const restoreBtn = document.getElementById('restore-data-btn');
    const restoreInput = document.getElementById('restore-data-input');


    // --- App Initialization ---
    async function initApp() {
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        await setLanguage('es');
        await fetchData();
        renderUI(state);
        attachEventListeners();
        document.body.dataset.ready = 'true';
    }

    async function fetchData() {
        try {
            const currentUser = getCurrentUser();
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

            state.products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            state.customers = customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            state.orders = ordersSnap.docs.map(doc => {
                const order = { id: doc.id, ...doc.data() };
                if (order.productId && !order.items) {
                    order.items = [{
                        productId: order.productId,
                        quantity: order.quantity,
                        price: order.total / order.quantity,
                        priceType: 'retail'
                    }];
                }
                return order;
            });
            state.payments = paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            state.users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error fetching data:", error);
            showNotification(`Error fetching data: ${error.message}`, 'error');
        }
    }

    function attachEventListeners() {
        if (listenersAttached) return;

        // Search and Filter Listeners
        document.getElementById('customers-search').addEventListener('input', (e) => {
            state.filters.customerSearch = e.target.value;
            renderUI(state);
        });

        document.getElementById('products-search').addEventListener('input', (e) => {
            state.filters.productSearch = e.target.value;
            renderUI(state);
        });

        // Modal and Form Listeners
        document.getElementById('add-product-btn').addEventListener('click', () => openModal('product-modal'));
        document.getElementById('add-customer-btn').addEventListener('click', () => openModal('customer-modal'));
        document.getElementById('add-order-btn').addEventListener('click', () => openModal('order-modal'));
        document.getElementById('add-payment-btn').addEventListener('click', () => openModal('payment-modal'));

        document.querySelectorAll('.modal .close-btn').forEach(btn => btn.addEventListener('click', closeModal));
        modalBackdrop.addEventListener('click', closeModal);

        // Payment validation listener
        document.getElementById('payment-amount').addEventListener('input', (e) => {
            const amount = parseFloat(e.target.value);
            const paymentOrderSelect = document.getElementById('payment-order');
            const selectedOption = paymentOrderSelect.options[paymentOrderSelect.selectedIndex];

            if (selectedOption && selectedOption.dataset.balance) {
                const balance = parseFloat(selectedOption.dataset.balance);
                if (amount > balance) {
                    e.target.value = balance;
                    showNotification('El monto del pago no puede exceder el saldo pendiente.', 'warning');
                }
            }
        });

        // Generic click handler for edit, delete, pay, whatsapp buttons
        document.querySelector('.main-content').addEventListener('click', (e) => {
            const target = e.target.closest('.action-btn');
            if (!target) return;

            const id = target.dataset.id;
            const type = target.dataset.type;

            if (target.classList.contains('edit')) {
                handleEdit(id, type);
            } else if (target.classList.contains('delete')) {
                handleDelete(id, type);
            } else if (target.classList.contains('pay')) {
                handlePay(id);
            } else if (target.classList.contains('whatsapp-btn')) {
                handleWhatsApp(id, type, target.dataset);
            }
        });

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = link.dataset.tab;

                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                tabs.forEach(t => t.classList.remove('active'));
                document.getElementById(tabId).classList.add('active');

                if (tabId === 'dashboard') {
                    renderUI(state);
                }
            });
        });

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
            await saveOrUpdate('customers', id, data);
            await initApp();
            closeModal();
        });

        orderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            // Logic to save or update an order
            await initApp();
            closeModal();
        });

        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            // Logic to save or update a payment
            await initApp();
            closeModal();
        });

        backupBtn.addEventListener('click', () => {
            const wb = XLSX.utils.book_new();
            const ws_products = XLSX.utils.json_to_sheet(state.products);
            const ws_customers = XLSX.utils.json_to_sheet(state.customers);
            const ws_orders = XLSX.utils.json_to_sheet(state.orders);
            const ws_payments = XLSX.utils.json_to_sheet(state.payments);

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
                    showNotification("Data restored successfully!", 'success');
                    await initApp();
                }
            };
            reader.readAsArrayBuffer(file);
        });

        listenersAttached = true;
    }

    function openModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
        modalBackdrop.classList.remove('hidden');
    }

    function closeModal() {
        modals.forEach(m => m.classList.add('hidden'));
        modalBackdrop.classList.add('hidden');
    }

    function handleEdit(id, type) {
        let item;
        switch(type) {
            case 'product':
                item = state.products.find(i => i.id === id);
                if (!item) return;
                document.getElementById('product-id').value = item.id;
                document.getElementById('product-description').value = item.description;
                document.getElementById('product-retail-price').value = item.retailPrice;
                document.getElementById('product-wholesale-price').value = item.wholesalePrice;
                document.getElementById('product-modal-title').textContent = t('edit_product');
                openModal('product-modal');
                break;
            case 'customer':
                item = state.customers.find(i => i.id === id);
                if (!item) return;
                document.getElementById('customer-id').value = item.id;
                document.getElementById('customer-name').value = item.name;
                document.getElementById('customer-phone').value = item.phone;
                document.getElementById('customer-modal-title').textContent = t('edit_customer');
                openModal('customer-modal');
                break;
            case 'order':
                item = state.orders.find(i => i.id === id);
                if (!item) return;
                // Logic to populate order form for editing
                openModal('order-modal');
                break;
            case 'payment':
                item = state.payments.find(i => i.id === id);
                if (!item) return;
                document.getElementById('payment-id').value = item.id;
                document.getElementById('payment-date').value = new Date(item.date).toISOString().split('T')[0];
                document.getElementById('payment-amount').value = item.amount;
                document.getElementById('payment-reference').value = item.reference;
                openModal('payment-modal');
                break;
        }
    }

    async function handleDelete(id, type) {
        if (confirm(`Are you sure you want to delete this ${type}?`)) {
            const currentUser = getCurrentUser();
            await deleteDoc(doc(db, `users/${currentUser.uid}/${type}s`, id));
            await initApp();
            showNotification(`${type} deleted successfully`, 'success');
        }
    }

    function handlePay(id) {
        const order = state.orders.find(o => o.id === id);
        if (!order) return;

        document.getElementById('payment-form').reset();
        document.getElementById('payment-order-id').value = id;

        const paymentOrderSelect = document.getElementById('payment-order');
        paymentOrderSelect.innerHTML = `<option value="${id}">Order #${id.substring(0,5)}</option>`;
        paymentOrderSelect.disabled = true;

        const remaining = order.total - (order.amountPaid || 0);
        document.getElementById('payment-amount').value = remaining.toFixed(2);
        document.getElementById('payment-modal-title').textContent = 'Register Payment';
        openModal('payment-modal');
    }

    function handleWhatsApp(id, type, dataset) {
        let customer, message = '';
        if (type === 'order') {
            const order = state.orders.find(o => o.id === id);
            if(order) {
                customer = state.customers.find(c => c.id === order.customerId);
                const itemsSummary = (order.items || []).map(item => {
                    const product = state.products.find(p => p.id === item.productId);
                    return `• ${item.quantity} x ${product.description}`;
                }).join('\n');
                message = `Order Details:\n${itemsSummary}\nTotal: ${formatCurrency(order.total)}`;
            }
        } else {
            customer = state.customers.find(c => c.id === id);
            if (type === 'pending-payment') {
                message = `Reminder: You have a pending payment of ${formatCurrency(dataset.amount)}.`;
            }
        }

        if (!customer || !customer.phone) {
            showNotification(t('customer_has_no_phone'), 'error');
            return;
        }

        if (message) {
            const whatsappUrl = `https://wa.me/${customer.phone}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
        }
    }

    async function saveOrUpdate(collectionName, id, data) {
        const currentUser = getCurrentUser();
        const collectionRef = collection(db, `users/${currentUser.uid}/${collectionName}`);
        if (id) {
            await updateDoc(doc(collectionRef, id), data);
            return id;
        } else {
            const newDocRef = await addDoc(collectionRef, data);
            return newDocRef.id;
        }
    }

    async function restoreDataFromWorkbook(workbook) {
        const currentUser = getCurrentUser();
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

    // --- Auth Callbacks ---
    const onUserAuthenticated = () => initApp();
    const onUserSignedOut = () => setLanguage(navigator.language.split('-')[0] || 'es');

    initializeAuth(onUserAuthenticated, onUserSignedOut);
});
