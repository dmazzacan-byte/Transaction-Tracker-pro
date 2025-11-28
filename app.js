import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { firebaseConfig } from './firebase/config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let userId;
let products = [];
let customers = [];
let orders = [];
let payments = [];
let salesChart;
let salesByProductChart;

// Sign in the user anonymously
signInAnonymously(auth)
    .then(() => {
        console.log('User signed in anonymously');
    })
    .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error(`Anonymous sign-in failed: ${errorCode} - ${errorMessage}`);
    });

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        userId = user.uid;
        console.log(`User is signed in with UID: ${userId}`);
        loadAllData();
    } else {
        console.log('User is signed out');
    }
});

async function loadAllData() {
    await Promise.all([
        loadProducts(),
        loadCustomers(),
        loadOrders(),
        loadPayments()
    ]);
    updateDashboard();
    populateReportFilters();
}

let translations = {};

async function setLanguage(lang) {
    const response = await fetch(`locales/${lang}.json`);
    translations = await response.json();
    translatePage();
}

function translatePage() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = translations[key];
    });
}

async function loadProducts() {
    if (!userId) return;
    const productsTable = document.querySelector('#products-table tbody');
    productsTable.innerHTML = '';
    const querySnapshot = await getDocs(collection(db, `users/${userId}/products`));
    products = [];
    querySnapshot.forEach((doc) => {
        const product = { id: doc.id, ...doc.data() };
        products.push(product);
        const row = productsTable.insertRow();
        row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.retailPrice}</td>
            <td>${product.wholesalePrice}</td>
        `;
    });
}

async function loadCustomers() {
    if (!userId) return;
    const customersTable = document.querySelector('#customers-table tbody');
    customersTable.innerHTML = '';
    const querySnapshot = await getDocs(collection(db, `users/${userId}/customers`));
    customers = [];
    querySnapshot.forEach((doc) => {
        const customer = { id: doc.id, ...doc.data() };
        customers.push(customer);
        const row = customersTable.insertRow();
        row.innerHTML = `
            <td>${customer.name}</td>
            <td>${customer.email}</td>
            <td>${customer.phone}</td>
            <td>${customer.address}</td>
        `;
    });
}

async function loadOrders() {
    if (!userId) return;
    const ordersTable = document.querySelector('#orders-table tbody');
    ordersTable.innerHTML = '';
    const q = query(collection(db, `users/${userId}/orders`), orderBy("orderDate", "desc"));
    const querySnapshot = await getDocs(q);
    orders = [];
    querySnapshot.forEach((doc) => {
        const order = { id: doc.id, ...doc.data() };
        orders.push(order);
        const row = ordersTable.insertRow();
        const orderDate = order.orderDate.toDate().toLocaleDateString();
        row.innerHTML = `
            <td>${order.customerName}</td>
            <td>${orderDate}</td>
            <td>${order.total}</td>
            <td>${order.status}</td>
            <td><button class="expand-btn">Details</button></td>
        `;
        const detailsRow = ordersTable.insertRow();
        detailsRow.classList.add('details-row');
        detailsRow.style.display = 'none';
        let itemsHtml = '<ul>';
        order.items.forEach(item => {
            itemsHtml += `<li>${item.name} - ${item.quantity} x ${item.price}</li>`;
        });
        itemsHtml += '</ul>';
        detailsRow.innerHTML = `<td colspan="5">${itemsHtml}</td>`;

        row.querySelector('.expand-btn').addEventListener('click', () => {
            detailsRow.style.display = detailsRow.style.display === 'none' ? 'table-row' : 'none';
        });
    });
}

async function loadPayments() {
    if (!userId) return;
    const paymentsTable = document.querySelector('#payments-table tbody');
    paymentsTable.innerHTML = '';
    const querySnapshot = await getDocs(collection(db, `users/${userId}/payments`));
    payments = [];
    querySnapshot.forEach((doc) => {
        const payment = { id: doc.id, ...doc.data() };
        payments.push(payment);
        const row = paymentsTable.insertRow();
        const paymentDate = payment.paymentDate.toDate().toLocaleDateString();
        row.innerHTML = `
            <td>${payment.orderId}</td>
            <td>${paymentDate}</td>
            <td>${payment.amount}</td>
            <td>${payment.paymentMethod}</td>
            <td>${payment.bank}</td>
            <td>${payment.bankReference}</td>
        `;
    });
}

function updateDashboard() {
    // Summary Cards
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = orders.length;
    const pendingPayments = orders.filter(order => order.status === 'Pending').length;

    document.getElementById('total-revenue').textContent = `$${totalRevenue.toFixed(2)}`;
    document.getElementById('total-orders').textContent = totalOrders;
    document.getElementById('pending-payments').textContent = pendingPayments;

    // Sales Chart
    const salesData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
            label: 'Sales',
            data: [65, 59, 80, 81, 56, 55], // Using static data for now
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
        }]
    };

    const ctx = document.getElementById('sales-chart').getContext('2d');
    if (salesChart) {
        salesChart.destroy();
    }
    salesChart = new Chart(ctx, {
        type: 'bar',
        data: salesData,
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Recent Transactions
    const recentTransactionsTable = document.querySelector('#recent-transactions-table tbody');
    recentTransactionsTable.innerHTML = '';
    const recentOrders = orders.slice(0, 5); // Get the last 5 orders
    recentOrders.forEach(order => {
        const row = recentTransactionsTable.insertRow();
        const orderDate = order.orderDate.toDate().toLocaleDateString();
        row.innerHTML = `
            <td>${order.customerName}</td>
            <td>${orderDate}</td>
            <td>${order.total}</td>
        `;
    });
}

function populateReportFilters() {
    const productSelect = document.getElementById('report-product');
    const customerSelect = document.getElementById('report-customer');

    productSelect.innerHTML = '<option value="">All</option>';
    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.name;
        option.textContent = product.name;
        productSelect.appendChild(option);
    });

    customerSelect.innerHTML = '<option value="">All</option>';
    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.name;
        option.textContent = customer.name;
        customerSelect.appendChild(option);
    });
}

function applyReportFilters() {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    const selectedProduct = document.getElementById('report-product').value;
    const selectedCustomer = document.getElementById('report-customer').value;

    let filteredOrders = orders;

    if (startDate) {
        filteredOrders = filteredOrders.filter(order => order.orderDate.toDate() >= new Date(startDate));
    }
    if (endDate) {
        filteredOrders = filteredOrders.filter(order => order.orderDate.toDate() <= new Date(endDate));
    }
    if (selectedCustomer) {
        filteredOrders = filteredOrders.filter(order => order.customerName === selectedCustomer);
    }

    const salesByProduct = {};
    filteredOrders.forEach(order => {
        order.items.forEach(item => {
            if (selectedProduct && item.name !== selectedProduct) {
                return;
            }
            if (salesByProduct[item.name]) {
                salesByProduct[item.name] += item.quantity * item.price;
            } else {
                salesByProduct[item.name] = item.quantity * item.price;
            }
        });
    });

    const chartData = {
        labels: Object.keys(salesByProduct),
        datasets: [{
            label: 'Sales by Product',
            data: Object.values(salesByProduct),
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1
        }]
    };

    const ctx = document.getElementById('sales-by-product-chart').getContext('2d');
    if (salesByProductChart) {
        salesByProductChart.destroy();
    }
    salesByProductChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function downloadExcel(data, filename) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
}

document.addEventListener('DOMContentLoaded', () => {
    const languageSelect = document.getElementById('language-select');
    languageSelect.addEventListener('change', (event) => {
        setLanguage(event.target.value);
    });

    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = document.querySelector(`#${tab.dataset.tab}`);

            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            tabContents.forEach(c => c.classList.remove('active'));
            target.classList.add('active');
        });
    });

    // Activate the first tab by default
    tabs[0].classList.add('active');
    tabContents[0].classList.add('active');

    // Set the initial language
    setLanguage('en');

    // Product Modal logic
    const addProductModal = document.getElementById('add-product-modal');
    const addProductBtn = document.getElementById('add-product-btn');
    const closeProductModal = addProductModal.querySelector('.close-button');

    addProductBtn.onclick = function() {
        addProductModal.style.display = 'block';
    }

    closeProductModal.onclick = function() {
        addProductModal.style.display = 'none';
    }

    window.onclick = function(event) {
        if (event.target == addProductModal) {
            addProductModal.style.display = 'none';
        }
    }

    // Handle product form submission
    const addProductForm = document.getElementById('add-product-form');
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!userId) return;

        const productName = document.getElementById('product-name').value;
        const retailPrice = document.getElementById('retail-price').value;
        const wholesalePrice = document.getElementById('wholesale-price').value;

        try {
            await addDoc(collection(db, `users/${userId}/products`), {
                name: productName,
                retailPrice: parseFloat(retailPrice),
                wholesalePrice: parseFloat(wholesalePrice)
            });
            addProductForm.reset();
            addProductModal.style.display = 'none';
            loadProducts();
        } catch (error) {
            console.error("Error adding document: ", error);
        }
    });

    // Customer Modal logic
    const addCustomerModal = document.getElementById('add-customer-modal');
    const addCustomerBtn = document.getElementById('add-customer-btn');
    const closeCustomerModal = addCustomerModal.querySelector('.close-button');

    addCustomerBtn.onclick = function() {
        addCustomerModal.style.display = 'block';
    }

    closeCustomerModal.onclick = function() {
        addCustomerModal.style.display = 'none';
    }

    window.onclick = function(event) {
        if (event.target == addCustomerModal) {
            addCustomerModal.style.display = 'none';
        }
    }

    // Handle customer form submission
    const addCustomerForm = document.getElementById('add-customer-form');
    addCustomerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!userId) return;

        const customerName = document.getElementById('customer-name').value;
        const customerEmail = document.getElementById('customer-email').value;
        const customerPhone = document.getElementById('customer-phone').value;
        const customerAddress = document.getElementById('customer-address').value;

        try {
            await addDoc(collection(db, `users/${userId}/customers`), {
                name: customerName,
                email: customerEmail,
                phone: customerPhone,
                address: customerAddress
            });
            addCustomerForm.reset();
            addCustomerModal.style.display = 'none';
            loadCustomers();
        } catch (error) {
            console.error("Error adding document: ", error);
        }
    });

    // Order Modal logic
    const addOrderModal = document.getElementById('add-order-modal');
    const addOrderBtn = document.getElementById('add-order-btn');
    const closeOrderModal = addOrderModal.querySelector('.close-button');
    const orderCustomerSelect = document.getElementById('order-customer');
    const addItemBtn = document.getElementById('add-item-btn');
    const orderItemsContainer = document.getElementById('order-items');
    const orderTotalSpan = document.getElementById('order-total');

    addOrderBtn.onclick = function() {
        populateCustomerSelect();
        addOrderModal.style.display = 'block';
    }

    closeOrderModal.onclick = function() {
        addOrderModal.style.display = 'none';
    }

    window.onclick = function(event) {
        if (event.target == addOrderModal) {
            addOrderModal.style.display = 'none';
        }
    }

    function populateCustomerSelect() {
        orderCustomerSelect.innerHTML = '';
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.name;
            orderCustomerSelect.appendChild(option);
        });
    }

    addItemBtn.onclick = function() {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('order-item');

        const productSelect = document.createElement('select');
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = product.name;
            productSelect.appendChild(option);
        });

        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.value = 1;
        quantityInput.min = 1;

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.onclick = function() {
            itemDiv.remove();
            updateOrderTotal();
        }

        itemDiv.appendChild(productSelect);
        itemDiv.appendChild(quantityInput);
        itemDiv.appendChild(removeBtn);
        orderItemsContainer.appendChild(itemDiv);

        productSelect.onchange = updateOrderTotal;
        quantityInput.onchange = updateOrderTotal;
    }

    function updateOrderTotal() {
        let total = 0;
        document.querySelectorAll('.order-item').forEach(item => {
            const productId = item.querySelector('select').value;
            const quantity = item.querySelector('input').value;
            const product = products.find(p => p.id === productId);
            if (product) {
                total += product.retailPrice * quantity;
            }
        });
        orderTotalSpan.textContent = total.toFixed(2);
    }

    // Handle order form submission
    const addOrderForm = document.getElementById('add-order-form');
    addOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!userId) return;

        const customerId = orderCustomerSelect.value;
        const customer = customers.find(c => c.id === customerId);
        const orderStatus = document.getElementById('order-status').value;

        const items = [];
        document.querySelectorAll('.order-item').forEach(item => {
            const productId = item.querySelector('select').value;
            const quantity = parseInt(item.querySelector('input').value);
            const product = products.find(p => p.id === productId);
            if (product) {
                items.push({
                    name: product.name,
                    quantity: quantity,
                    price: product.retailPrice
                });
            }
        });

        const total = parseFloat(orderTotalSpan.textContent);

        try {
            await addDoc(collection(db, `users/${userId}/orders`), {
                customerName: customer.name,
                customerEmail: customer.email,
                orderDate: serverTimestamp(),
                total: total,
                status: orderStatus,
                items: items
            });
            addOrderForm.reset();
            orderItemsContainer.innerHTML = '';
            orderTotalSpan.textContent = '0';
            addOrderModal.style.display = 'none';
            loadAllData();
        } catch (error) {
            console.error("Error adding document: ", error);
        }
    });

    // Payment Modal logic
    const addPaymentModal = document.getElementById('add-payment-modal');
    const addPaymentBtn = document.getElementById('add-payment-btn');
    const closePaymentModal = addPaymentModal.querySelector('.close-button');
    const paymentOrderIdSelect = document.getElementById('payment-order-id');

    addPaymentBtn.onclick = function() {
        populateOrderSelect();
        addPaymentModal.style.display = 'block';
    }

    closePaymentModal.onclick = function() {
        addPaymentModal.style.display = 'none';
    }

    window.onclick = function(event) {
        if (event.target == addPaymentModal) {
            addPaymentModal.style.display = 'none';
        }
    }

    function populateOrderSelect() {
        paymentOrderIdSelect.innerHTML = '';
        orders.forEach(order => {
            const option = document.createElement('option');
            option.value = order.id;
            option.textContent = order.id;
            paymentOrderIdSelect.appendChild(option);
        });
    }

    // Handle payment form submission
    const addPaymentForm = document.getElementById('add-payment-form');
    addPaymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!userId) return;

        const orderId = paymentOrderIdSelect.value;
        const amount = document.getElementById('payment-amount').value;
        const paymentMethod = document.getElementById('payment-method').value;
        const bank = document.getElementById('payment-bank').value;
        const bankReference = document.getElementById('payment-reference').value;

        try {
            await addDoc(collection(db, `users/${userId}/payments`), {
                orderId: orderId,
                paymentDate: serverTimestamp(),
                amount: parseFloat(amount),
                paymentMethod: paymentMethod,
                bank: bank,
                bankReference: bankReference
            });
            addPaymentForm.reset();
            addPaymentModal.style.display = 'none';
            loadAllData();
        } catch (error) {
            console.error("Error adding document: ", error);
        }
    });

    // Reports logic
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    applyFiltersBtn.addEventListener('click', applyReportFilters);

    // Settings logic
    const downloadOrdersBtn = document.getElementById('download-orders-btn');
    downloadOrdersBtn.addEventListener('click', () => {
        const data = orders.map(order => ({
            'Customer': order.customerName,
            'Date': order.orderDate.toDate().toLocaleDateString(),
            'Total': order.total,
            'Status': order.status
        }));
        downloadExcel(data, 'orders');
    });

    const downloadPaymentsBtn = document.getElementById('download-payments-btn');
    downloadPaymentsBtn.addEventListener('click', () => {
        const data = payments.map(payment => ({
            'Order ID': payment.orderId,
            'Date': payment.paymentDate.toDate().toLocaleDateString(),
            'Amount': payment.amount,
            'Method': payment.paymentMethod,
            'Bank': payment.bank,
            'Reference': payment.bankReference
        }));
        downloadExcel(data, 'payments');
    });
});
