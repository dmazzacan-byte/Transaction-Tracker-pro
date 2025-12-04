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
    let products = [];
    let customers = [];
    let orders = [];
    let payments = [];
    let users = [];

    // --- DOM Elements ---
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
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
    let salesChart, productSalesChart;

    // --- Authentication ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            authContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
            initApp();
        } else {
            currentUser = null;
            authContainer.classList.remove('hidden');
            appContainer.classList.add('hidden');
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

    // --- App Initialization ---
    async function initApp() {
        if (!currentUser) return;
        await fetchData();
        renderAll();
        setupDashboard();
    }

    // --- Data Fetching ---
    async function fetchData() {
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
        orders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        payments = paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // --- Rendering ---
    function renderAll() {
        renderProducts();
        renderCustomers();
        renderOrders();
        renderPayments();
        renderUsers();
    }

    function renderProducts() {
        productsTableBody.innerHTML = '';
        products.forEach(p => {
            const row = `
                <tr>
                    <td>${p.description}</td>
                    <td>$${p.retailPrice?.toFixed(2)}</td>
                    <td>$${p.wholesalePrice?.toFixed(2)}</td>
                    <td>
                        <button class="action-btn edit" data-id="${p.id}" data-type="product" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete" data-id="${p.id}" data-type="product" title="Delete"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
            productsTableBody.innerHTML += row;
        });
    }

     function renderCustomers() {
        customersTableBody.innerHTML = '';
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        customers.forEach(c => {
            const customerOrders = orders.filter(o => o.customerId === c.id);

            const historicalVolume = customerOrders.reduce((sum, o) => sum + o.total, 0);

            const monthlyVolume = customerOrders
                .filter(o => {
                    const orderDate = new Date(o.date);
                    return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
                })
                .reduce((sum, o) => sum + o.total, 0);

            const pendingAmount = customerOrders
                .filter(o => o.status !== 'Paid')
                .reduce((sum, o) => sum + (o.total - (o.amountPaid || 0)), 0);

            const row = `
                <tr>
                    <td>${c.name}</td>
                    <td>${c.phone || ''}</td>
                    <td>$${monthlyVolume.toFixed(2)}</td>
                    <td>$${historicalVolume.toFixed(2)}</td>
                    <td>$${pendingAmount.toFixed(2)}</td>
                    <td>
                        <button class="action-btn edit" data-id="${c.id}" data-type="customer" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete" data-id="${c.id}" data-type="customer" title="Delete"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
            customersTableBody.innerHTML += row;
        });
    }

    function renderOrders() {
        ordersTableBody.innerHTML = '';
        orders.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by most recent
        orders.forEach(o => {
            const customer = customers.find(c => c.id === o.customerId)?.name || 'N/A';
            const product = products.find(p => p.id === o.productId)?.description || 'N/A';
            const statusClass = `status-${o.status.toLowerCase()}`;
            const row = `
                <tr>
                    <td>${new Date(o.date).toLocaleDateString()}</td>
                    <td>${customer}</td>
                    <td>${product}</td>
                    <td>${o.quantity}</td>
                    <td>$${o.total.toFixed(2)}</td>
                    <td>$${(o.amountPaid || 0).toFixed(2)}</td>
                    <td><span class="status ${statusClass}">${o.status}</span></td>
                    <td>
                        <button class="action-btn edit" data-id="${o.id}" data-type="order" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete" data-id="${o.id}" data-type="order" title="Delete"><i class="fas fa-trash"></i></button>
                        <button class="action-btn pay" data-id="${o.id}" data-type="order" title="Register Payment"><i class="fas fa-dollar-sign"></i></button>
                    </td>
                </tr>
            `;
            ordersTableBody.innerHTML += row;
        });
    }

    function renderPayments() {
        paymentsTableBody.innerHTML = '';
        payments.sort((a, b) => new Date(b.date) - new Date(a.date));
        payments.forEach(p => {
            const order = orders.find(o => o.id === p.orderId);
            const customer = customers.find(c => c.id === order?.customerId)?.name || 'N/A';
            const row = `
                <tr>
                    <td>${new Date(p.date).toLocaleDateString()}</td>
                    <td>${customer}</td>
                    <td>Order #${order?.id.substring(0, 5)}...</td>
                    <td>$${p.amount.toFixed(2)}</td>
                    <td>${p.reference || ''}</td>
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
    function openModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
        modalBackdrop.classList.remove('hidden');
    }

    function closeModal() {
        modals.forEach(m => m.classList.add('hidden'));
        modalBackdrop.classList.add('hidden');
    }

    modalBackdrop.addEventListener('click', closeModal);
    modals.forEach(m => m.querySelector('.close-btn').addEventListener('click', closeModal));

    // --- Event Listeners for Add Buttons ---
    addProductBtn.addEventListener('click', () => {
        productForm.reset();
        document.getElementById('product-id').value = '';
        document.getElementById('product-modal-title').textContent = 'New Product';
        openModal('product-modal');
    });

    addCustomerBtn.addEventListener('click', () => {
        customerForm.reset();
        document.getElementById('customer-id').value = '';
        document.getElementById('customer-modal-title').textContent = 'New Customer';
        openModal('customer-modal');
    });

    addOrderBtn.addEventListener('click', () => {
        orderForm.reset();
        document.getElementById('order-id').value = '';
        populateSelect('order-customer', customers, 'id', 'name');
        populateSelect('order-product', products, 'id', 'description');
        document.getElementById('order-modal-title').textContent = 'New Order';
        openModal('order-modal');
    });

    addPaymentBtn.addEventListener('click', () => {
        paymentForm.reset();
        populateSelect('payment-order', orders, 'id', 'id'); // Simple display, could be improved
        document.getElementById('payment-modal-title').textContent = 'New Payment';
        openModal('payment-modal');
    });


    // --- Form Submissions ---
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('product-id').value;
        const data = {
            description: document.getElementById('product-description').value,
            retailPrice: parseFloat(document.getElementById('product-retail-price').value),
            wholesalePrice: parseFloat(document.getElementById('product-wholesale-price').value),
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
        closeModal();
        await initApp();
    });

    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('order-id').value;
        const productId = document.getElementById('order-product').value;
        const product = products.find(p => p.id === productId);
        const quantity = parseInt(document.getElementById('order-quantity').value);
        const status = document.getElementById('order-status').value;
        const total = product.retailPrice * quantity; // Assuming retail for now

        const data = {
            customerId: document.getElementById('order-customer').value,
            productId: productId,
            quantity: quantity,
            total: total,
            status: status,
            amountPaid: status === 'Paid' ? total : 0,
            date: new Date().toISOString()
        };

        await saveOrUpdate('orders', id, data);
        closeModal();
        await initApp();
    });

     paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const orderId = document.getElementById('payment-order-id').value || document.getElementById('payment-order').value;
        const amount = parseFloat(document.getElementById('payment-amount').value);

        const data = {
            orderId: orderId,
            amount: amount,
            reference: document.getElementById('payment-reference').value,
            date: new Date().toISOString()
        };

        // Add payment
        await addDoc(collection(db, `users/${currentUser.uid}/payments`), data);

        // Update order
        const order = orders.find(o => o.id === orderId);
        if (order) {
            const newAmountPaid = (order.amountPaid || 0) + amount;
            const newStatus = newAmountPaid >= order.total ? 'Paid' : 'Partial';
            const orderRef = doc(db, `users/${currentUser.uid}/orders`, orderId);
            await updateDoc(orderRef, { amountPaid: newAmountPaid, status: newStatus });
        }

        closeModal();
        await initApp();
    });

    async function saveOrUpdate(collectionName, id, data) {
        const collectionRef = collection(db, `users/${currentUser.uid}/${collectionName}`);
        if (id) {
            await updateDoc(doc(collectionRef, id), data);
        } else {
            await addDoc(collectionRef, data);
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
        }
    });

    function handleEdit(id, type) {
        const item = window[type+'s'].find(i => i.id === id);
        if (!item) return;

        switch(type) {
            case 'product':
                document.getElementById('product-id').value = item.id;
                document.getElementById('product-description').value = item.description;
                document.getElementById('product-retail-price').value = item.retailPrice;
                document.getElementById('product-wholesale-price').value = item.wholesalePrice;
                document.getElementById('product-modal-title').textContent = 'Edit Product';
                openModal('product-modal');
                break;
            case 'customer':
                document.getElementById('customer-id').value = item.id;
                document.getElementById('customer-name').value = item.name;
                document.getElementById('customer-phone').value = item.phone;
                document.getElementById('customer-modal-title').textContent = 'Edit Customer';
                openModal('customer-modal');
                break;
            case 'order':
                 document.getElementById('order-id').value = item.id;
                 populateSelect('order-customer', customers, 'id', 'name', item.customerId);
                 populateSelect('order-product', products, 'id', 'description', item.productId);
                 document.getElementById('order-quantity').value = item.quantity;
                 document.getElementById('order-status').value = item.status;
                 document.getElementById('order-modal-title').textContent = 'Edit Order';
                 openModal('order-modal');
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
        dashboardMonthSelect.addEventListener('change', updateDashboard);
        dashboardYearSelect.addEventListener('change', updateDashboard);
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

    function renderSalesChart(filteredOrders, month, year) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const salesData = new Array(daysInMonth).fill(0);

        filteredOrders.forEach(o => {
            const day = new Date(o.date).getDate();
            salesData[day - 1] += o.total;
        });

        const ctx = document.getElementById('sales-chart').getContext('2d');
        if (salesChart) salesChart.destroy();
        salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Daily Sales',
                    data: salesData,
                    borderColor: 'rgba(0, 123, 255, 1)',
                    backgroundColor: 'rgba(0, 123, 255, 0.2)',
                    fill: true,
                }]
            },
            options: { responsive: true }
        });
    }

    function renderProductSalesChart(filteredOrders) {
         const productSales = {};
         filteredOrders.forEach(o => {
             const productName = products.find(p => p.id === o.productId)?.description || 'Unknown';
             productSales[productName] = (productSales[productName] || 0) + o.total;
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
        let customerRankingChart;
        if (customerRankingChart) customerRankingChart.destroy();
        customerRankingChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Sales',
                    data: data,
                    backgroundColor: '#28a745',
                }]
            },
            options: { responsive: true, indexAxis: 'y', maintainAspectRatio: false }
        });
    }

    function renderPendingOrders(allOrders) {
        pendingOrdersList.innerHTML = '';
        const pending = allOrders.filter(o => o.status !== 'Paid').slice(0, 5); // Show top 5
        if (pending.length === 0) {
            pendingOrdersList.innerHTML = '<li>No pending payments.</li>';
            return;
        }
        pending.forEach(o => {
            const customerName = customers.find(c => c.id === o.customerId)?.name || 'N/A';
            const remaining = o.total - (o.amountPaid || 0);
            const li = `<li>${customerName} - $${remaining.toFixed(2)} remaining</li>`;
            pendingOrdersList.innerHTML += li;
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
