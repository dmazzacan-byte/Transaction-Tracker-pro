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
import { setLanguage, t } from './i18n.js';

document.addEventListener('DOMContentLoaded', async () => {
    await setLanguage('es');

    // --- State & Elements ---
    let currentUser = null;
    let products = [], customers = [], orders = [], payments = [], users = [];
    const DOMElements = {
        authContainer: document.getElementById('auth-container'),
        appContainer: document.getElementById('app-container'),
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        logoutBtn: document.getElementById('logout-btn'),
        navLinks: document.querySelectorAll('.nav-link'),
        tabs: document.querySelectorAll('.tab-content'),
        modalBackdrop: document.getElementById('modal-backdrop'),
        modals: document.querySelectorAll('.modal'),
        menuToggle: document.querySelector('.menu-toggle'),
        sidebar: document.querySelector('.sidebar'),
        addProductBtn: document.getElementById('add-product-btn'),
        addCustomerBtn: document.getElementById('add-customer-btn'),
        addOrderBtn: document.getElementById('add-order-btn'),
        addPaymentBtn: document.getElementById('add-payment-btn'),
        productsTableBody: document.getElementById('products-table-body'),
        customersTableBody: document.getElementById('customers-table-body'),
        ordersTableBody: document.getElementById('orders-table-body'),
        paymentsTableBody: document.getElementById('payments-table-body'),
        usersTableBody: document.getElementById('users-table-body'),
        productForm: document.getElementById('product-form'),
        customerForm: document.getElementById('customer-form'),
        orderForm: document.getElementById('order-form'),
        paymentForm: document.getElementById('payment-form'),
        backupBtn: document.getElementById('backup-data-btn'),
        restoreBtn: document.getElementById('restore-data-btn'),
        restoreInput: document.getElementById('restore-data-input'),
        dashboardMonthSelect: document.getElementById('dashboard-month'),
        dashboardYearSelect: document.getElementById('dashboard-year'),
        pendingOrdersList: document.getElementById('pending-orders-list'),
        totalPendingAmountEl: document.getElementById('total-pending-amount'),
        ordersMonthSelect: document.getElementById('orders-month'),
        ordersYearSelect: document.getElementById('orders-year'),
        orderCustomerFilter: document.getElementById('order-customer-filter'),
        orderProductFilter: document.getElementById('order-product-filter'),
        orderStatusFilter: document.getElementById('order-status-filter'),
        paymentCustomerFilter: document.getElementById('payment-customer-filter'),
        addOrderItemBtn: document.getElementById('add-order-item-btn'),
        orderItemsContainer: document.getElementById('order-items-container'),
        orderTotalEl: document.getElementById('order-total'),
      };
    let salesChart, productSalesChart, customerRankingChart;

    // --- Authentication ---
    onAuthStateChanged(auth, user => {
        if (user) {
            currentUser = user;
            DOMElements.authContainer.style.display = 'none';
            DOMElements.appContainer.style.display = 'block';
            DOMElements.loader.style.display = 'flex';
            initApp();
        } else {
            currentUser = null;
            DOMElements.authContainer.style.display = 'block';
            DOMElements.appContainer.style.display = 'none';
            DOMElements.loader.style.display = 'none';
        }
    });

    DOMElements.loginForm.addEventListener('submit', e => {
        e.preventDefault();
        DOMElements.loader.style.display = 'flex';
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        signInWithEmailAndPassword(auth, email, password)
            .catch(err => {
                DOMElements.loader.style.display = 'none';
                alert(err.message);
            });
    });
    DOMElements.registerForm.addEventListener('submit', e => { e.preventDefault(); createUserWithEmailAndPassword(auth, document.getElementById('register-email').value, document.getElementById('register-password').value).then(cred => addDoc(collection(db, `users/${cred.user.uid}/users`), { uid: cred.user.uid, email: cred.user.email, name: cred.user.email.split('@')[0] })).catch(err => alert(err.message)); });
    DOMElements.logoutBtn.addEventListener('click', () => signOut(auth));
    document.getElementById('show-register').addEventListener('click', () => { document.getElementById('login-view').classList.add('hidden'); document.getElementById('register-view').classList.remove('hidden'); });
    document.getElementById('show-login').addEventListener('click', () => { document.getElementById('login-view').classList.remove('hidden'); document.getElementById('register-view').classList.add('hidden'); });

    // --- App Initialization & Data ---
    async function initApp() {
        if (!currentUser) return;
        try {
            await fetchData();
            setupFilters();
            renderAll();
            setupEventListeners();
            setupDashboard();
            DOMElements.loader.style.display = 'none';
        } catch (error) {
            console.error("Error initializing app:", error);
            DOMElements.loader.style.display = 'none';
        }
    }

    async function fetchData() {
        const userId = currentUser.uid;
        const [pSnap, cSnap, oSnap, paySnap, uSnap] = await Promise.all([
            getDocs(collection(db, `users/${userId}/products`)),
            getDocs(collection(db, `users/${userId}/customers`)),
            getDocs(collection(db, `users/${userId}/orders`)),
            getDocs(collection(db, `users/${userId}/payments`)),
            getDocs(collection(db, `users/${userId}/users`))
        ]);
        products = pSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        customers = cSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        orders = oSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        payments = paySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const userDocs = uSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        users = userDocs.some(u => u.uid === currentUser.uid) ? userDocs : [...userDocs, { uid: currentUser.uid, email: currentUser.email, name: currentUser.email.split('@')[0] }];
    }

    // --- Rendering ---
    function renderAll() { renderProducts(); renderCustomers(); renderOrders(); renderPayments(); renderUsers(); }
    function renderProducts() { DOMElements.productsTableBody.innerHTML = products.map(p => `<tr><td>${p.description}</td><td>$${p.retailPrice?.toFixed(2)}</td><td>$${p.wholesalePrice?.toFixed(2)}</td><td><button class="action-btn edit" data-id="${p.id}" data-type="product" title="${t('editProductTitle')}"><i class="fas fa-edit"></i></button><button class="action-btn delete" data-id="${p.id}" data-type="product" title="${t('actions')}"><i class="fas fa-trash"></i></button></td></tr>`).join(''); }
    function renderCustomers() { customers.sort((a, b) => a.name.localeCompare(b.name)); DOMElements.customersTableBody.innerHTML = customers.map(c => { const pending = orders.filter(o => o.customerId === c.id && o.status !== 'Paid').reduce((s, o) => s + (o.total - (o.amountPaid || 0)), 0); return `<tr><td>${c.name}</td><td>${c.phone||''}</td><td>N/A</td><td>N/A</td><td>$${pending.toFixed(2)}</td><td><button class="action-btn edit" data-id="${c.id}" data-type="customer" title="${t('editCustomerTitle')}"><i class="fas fa-edit"></i></button><button class="action-btn delete" data-id="${c.id}" data-type="customer" title="${t('actions')}"><i class="fas fa-trash"></i></button></td></tr>`; }).join(''); }
    function renderOrders() {
        const month = parseInt(DOMElements.ordersMonthSelect.value), year = parseInt(DOMElements.ordersYearSelect.value);
        const customerId = DOMElements.orderCustomerFilter.value, productId = DOMElements.orderProductFilter.value, status = DOMElements.orderStatusFilter.value;
        const filtered = orders.filter(o => new Date(o.date).getMonth() === month && new Date(o.date).getFullYear() === year && (!customerId || o.customerId === customerId) && (!productId || o.items.some(item => item.productId === productId)) && (!status || o.status === status));
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        DOMElements.ordersTableBody.innerHTML = filtered.map(o => { const c = customers.find(c => c.id === o.customerId)?.name || 'N/A'; const itemsHtml = o.items.map(item => `${item.quantity} x ${products.find(p => p.id === item.productId)?.description || 'N/A'}`).join('<br>'); return `<tr><td>${new Date(o.date).toLocaleDateString()}</td><td>${c}</td><td>${itemsHtml}</td><td>${o.items.reduce((sum, i) => sum + i.quantity, 0)}</td><td>$${o.total.toFixed(2)}</td><td>$${(o.amountPaid||0).toFixed(2)}</td><td><span class="status status-${o.status.toLowerCase()}">${t(`status${o.status}`)}</span></td><td><button class="action-btn edit" data-id="${o.id}" data-type="order" title="${t('editOrderTitle')}"><i class="fas fa-edit"></i></button><button class="action-btn delete" data-id="${o.id}" data-type="order" title="${t('actions')}"><i class="fas fa-trash"></i></button><button class="action-btn pay" data-id="${o.id}" data-type="order" title="${t('registerPaymentTitle')}"><i class="fas fa-dollar-sign"></i></button></td></tr>`; }).join('');
    }
    function renderPayments() { const customerId = DOMElements.paymentCustomerFilter.value; const filtered = payments.filter(p => { const order = orders.find(o => o.id === p.orderId); return !customerId || (order && order.customerId === customerId); }); filtered.sort((a, b) => new Date(b.date) - new Date(a.date)); DOMElements.paymentsTableBody.innerHTML = filtered.map(p => { const o = orders.find(o => o.id === p.orderId); const c = customers.find(c => c.id === o?.customerId)?.name || 'N/A'; return `<tr><td>${new Date(p.date).toLocaleDateString()}</td><td>${c}</td><td>${t('order')} #${o?.id.substring(0,5)}...</td><td>$${p.amount.toFixed(2)}</td><td>${p.reference||''}</td></tr>`; }).join(''); }
    function renderUsers() { DOMElements.usersTableBody.innerHTML = users.map(u => `<tr><td>${u.name||u.email.split('@')[0]}</td><td>${u.email}</td><td><button class="action-btn delete" data-id="${u.id}" data-type="user" title="${t('actions')}" ${u.uid===currentUser.uid?'disabled':''}><i class="fas fa-trash"></i></button></td></tr>`).join(''); }

    // --- Modals, Forms & General Event Listeners ---
    function setupEventListeners() {
        DOMElements.menuToggle.addEventListener('click', () => DOMElements.sidebar.classList.toggle('open'));
        DOMElements.modalBackdrop.addEventListener('click', closeModal);
        DOMElements.modals.forEach(m => m.querySelector('.close-btn').addEventListener('click', closeModal));
        DOMElements.addProductBtn.addEventListener('click', () => { DOMElements.productForm.reset(); DOMElements.productForm.querySelector('#product-id').value = ''; document.getElementById('product-modal-title').textContent = t('newProduct'); openModal('product-modal'); });
        DOMElements.addCustomerBtn.addEventListener('click', () => { DOMElements.customerForm.reset(); DOMElements.customerForm.querySelector('#customer-id').value = ''; document.getElementById('customer-modal-title').textContent = t('newCustomer'); openModal('customer-modal'); });
        DOMElements.addOrderBtn.addEventListener('click', () => { DOMElements.orderForm.reset(); DOMElements.orderItemsContainer.innerHTML = ''; addOrderItemRow(); document.getElementById('order-modal-title').textContent = t('newOrder'); openModal('order-modal'); });
        document.getElementById('show-customer-modal-btn').addEventListener('click', () => openModal('customer-modal', true));
         DOMElements.addPaymentBtn.addEventListener('click', () => { DOMElements.paymentForm.reset(); populateSelect('payment-order', orders, 'id', 'id'); document.getElementById('payment-modal-title').textContent = t('newPayment'); openModal('payment-modal'); });
        DOMElements.addOrderItemBtn.addEventListener('click', addOrderItemRow);
        DOMElements.orderItemsContainer.addEventListener('change', e => { if (e.target.classList.contains('order-item-product') || e.target.classList.contains('order-item-quantity')) { updateOrderTotal(); } });

        DOMElements.productForm.addEventListener('submit', async e => { e.preventDefault(); await saveOrUpdate('products', DOMElements.productForm.querySelector('#product-id').value, { description: DOMElements.productForm.querySelector('#product-description').value, retailPrice: parseFloat(DOMElements.productForm.querySelector('#product-retail-price').value), wholesalePrice: parseFloat(DOMElements.productForm.querySelector('#product-wholesale-price').value) }); closeModal(); await initApp(); });
        DOMElements.customerForm.addEventListener('submit', async e => { e.preventDefault(); const id = DOMElements.customerForm.querySelector('#customer-id').value; const data = { name: DOMElements.customerForm.querySelector('#customer-name').value, phone: DOMElements.customerForm.querySelector('#customer-phone').value }; const newId = await saveOrUpdate('customers', id, data, true); if (!id) { customers.push({ id: newId, ...data }); if (document.getElementById('customer-modal').dataset.fromOrderModal === 'true') { document.getElementById('order-customer-autocomplete').value = data.name; document.getElementById('order-customer-id').value = newId; } } closeModal(); await initApp(); });
        DOMElements.orderForm.addEventListener('submit', async e => { e.preventDefault(); const items = []; DOMElements.orderItemsContainer.querySelectorAll('.order-item-row').forEach(row => { const productId = row.querySelector('.order-item-product').value; const quantity = parseInt(row.querySelector('.order-item-quantity').value); if (productId && quantity > 0) { items.push({ productId, quantity }); } }); const total = calculateOrderTotal(items); const status = DOMElements.orderForm.querySelector('#order-status').value; await saveOrUpdate('orders', DOMElements.orderForm.querySelector('#order-id').value, { customerId: document.getElementById('order-customer-id').value, items, total, status, amountPaid: status === 'Paid' ? total : 0, date: new Date().toISOString() }); closeModal(); await initApp(); });
        DOMElements.paymentForm.addEventListener('submit', async e => { e.preventDefault(); const orderId = DOMElements.paymentForm.querySelector('#payment-order-id').value || DOMElements.paymentForm.querySelector('#payment-order').value; const amount = parseFloat(DOMElements.paymentForm.querySelector('#payment-amount').value); await saveOrUpdate('payments', DOMElements.paymentForm.querySelector('#payment-id').value, { orderId, amount, reference: DOMElements.paymentForm.querySelector('#payment-reference').value, date: new Date().toISOString() }); const order = orders.find(o => o.id === orderId); if (order) { const newPaid = (order.amountPaid || 0) + amount; await updateDoc(doc(db, `users/${currentUser.uid}/orders`, orderId), { amountPaid: newPaid, status: newPaid >= order.total ? 'Paid' : 'Partial' }); } closeModal(); await initApp(); });
        document.querySelector('.main-content').addEventListener('click', async e => { const target = e.target.closest('.action-btn'); if (!target) return; const id = target.dataset.id, type = target.dataset.type; if (target.classList.contains('edit')) handleEdit(id, type); else if (target.classList.contains('delete')) { if (confirm(t('deleteConfirm', { type: t(type) }))) { await deleteDoc(doc(db, `users/${currentUser.uid}/${type}s`, id)); await initApp(); } } else if (target.classList.contains('pay')) { const order = orders.find(o => o.id === id); DOMElements.paymentForm.reset(); DOMElements.paymentForm.querySelector('#payment-order-id').value = id; const sel = DOMElements.paymentForm.querySelector('#payment-order'); sel.innerHTML = `<option value="${id}">${t('order')} #${id.substring(0,5)}</option>`; sel.disabled = true; DOMElements.paymentForm.querySelector('#payment-amount').value = (order.total - (order.amountPaid || 0)).toFixed(2); document.getElementById('payment-modal-title').textContent = t('registerPaymentTitle'); openModal('payment-modal'); } });
    }
    function openModal(id, fromOrder = false) { const modal = document.getElementById(id); modal.classList.remove('hidden'); modal.dataset.fromOrderModal = fromOrder; DOMElements.modalBackdrop.classList.remove('hidden'); }
    function closeModal() { const custModal = document.getElementById('customer-modal'); DOMElements.modals.forEach(m => m.classList.add('hidden')); if (custModal.dataset.fromOrderModal === 'true') { document.getElementById('order-modal').classList.remove('hidden'); custModal.dataset.fromOrderModal = 'false'; } else { DOMElements.modalBackdrop.classList.add('hidden'); } }
    async function saveOrUpdate(coll, id, data, retId = false) { const ref = collection(db, `users/${currentUser.uid}/${coll}`); if (id) { await updateDoc(doc(ref, id), data); return id; } else { const docRef = await addDoc(ref, data); return retId ? docRef.id : null; } }
    function handleEdit(id, type) { let item; switch (type) { case 'product': item = products.find(i=>i.id===id); break; case 'customer': item = customers.find(i=>i.id===id); break; case 'order': item = orders.find(i=>i.id===id); break; case 'payment': item = payments.find(i=>i.id===id); break; } if (!item) return; switch (type) { case 'product': document.getElementById('product-id').value=item.id; document.getElementById('product-description').value=item.description; document.getElementById('product-retail-price').value=item.retailPrice; document.getElementById('product-wholesale-price').value=item.wholesalePrice; document.getElementById('product-modal-title').textContent=t('editProductTitle'); openModal('product-modal'); break; case 'customer': document.getElementById('customer-id').value=item.id; document.getElementById('customer-name').value=item.name; document.getElementById('customer-phone').value=item.phone; document.getElementById('customer-modal-title').textContent=t('editCustomerTitle'); openModal('customer-modal'); break; case 'order': document.getElementById('order-id').value=item.id; const cust = customers.find(c=>c.id===item.customerId); if(cust){document.getElementById('order-customer-autocomplete').value=cust.name; document.getElementById('order-customer-id').value=cust.id;} DOMElements.orderItemsContainer.innerHTML = ''; item.items.forEach(orderItem => addOrderItemRow(orderItem)); updateOrderTotal(); document.getElementById('order-status').value=item.status; document.getElementById('order-modal-title').textContent=t('editOrderTitle'); openModal('order-modal'); break; case 'payment': document.getElementById('payment-id').value=item.id; populateSelect('payment-order',orders,'id','id',item.orderId); document.getElementById('payment-amount').value=item.amount; document.getElementById('payment-reference').value=item.reference; document.getElementById('payment-modal-title').textContent=t('editPaymentTitle'); openModal('payment-modal'); break; } }

    // --- Order Items ---
    function addOrderItemRow(item = null) {
        const row = document.createElement('div');
        row.className = 'order-item-row';
        const productOptions = products.map(p => `<option value="${p.id}" ${item && item.productId === p.id ? 'selected' : ''}>${p.description}</option>`).join('');
        row.innerHTML = `<select class="order-item-product"><option value="">${t('selectOption')}</option>${productOptions}</select> <input type="number" class="order-item-quantity" value="${item ? item.quantity : 1}" min="1"> <button type="button" class="remove-order-item-btn"><i class="fas fa-trash"></i></button>`;
        DOMElements.orderItemsContainer.appendChild(row);
        row.querySelector('.remove-order-item-btn').addEventListener('click', () => { row.remove(); updateOrderTotal(); });
    }
    function updateOrderTotal() { DOMElements.orderTotalEl.textContent = calculateOrderTotal(getOrderItemData()).toFixed(2); }
    function getOrderItemData() { const items = []; DOMElements.orderItemsContainer.querySelectorAll('.order-item-row').forEach(row => { const productId = row.querySelector('.order-item-product').value; const quantity = parseInt(row.querySelector('.order-item-quantity').value); if (productId && quantity > 0) { items.push({ productId, quantity }); } }); return items; }
    function calculateOrderTotal(items) { return items.reduce((total, item) => { const product = products.find(p => p.id === item.productId); return total + (product ? product.retailPrice * item.quantity : 0); }, 0); }

    // --- Navigation & Filters ---
    DOMElements.navLinks.forEach(link => link.addEventListener('click', e => { e.preventDefault(); const tabId = link.dataset.tab; DOMElements.navLinks.forEach(l => l.classList.remove('active')); link.classList.add('active'); DOMElements.tabs.forEach(t => t.classList.remove('active')); document.getElementById(tabId).classList.add('active'); if (tabId === 'dashboard') setupDashboard(); DOMElements.sidebar.classList.remove('open'); }));
    function setupFilters() { populateDateFilters(DOMElements.dashboardMonthSelect, DOMElements.dashboardYearSelect); populateDateFilters(DOMElements.ordersMonthSelect, DOMElements.ordersYearSelect); populateSelect(DOMElements.orderCustomerFilter, customers, 'id', 'name', '', t('allCustomers')); populateSelect(DOMElements.orderProductFilter, products, 'id', 'description', '', t('allProducts')); populateSelect(DOMElements.paymentCustomerFilter, customers, 'id', 'name', '', t('allCustomers')); [DOMElements.ordersMonthSelect, DOMElements.ordersYearSelect, DOMElements.orderCustomerFilter, DOMElements.orderProductFilter, DOMElements.orderStatusFilter].forEach(el => el.addEventListener('change', renderOrders)); DOMElements.paymentCustomerFilter.addEventListener('change', renderPayments); }
    function populateDateFilters(monthSel, yearSel) { const months = [t('january'), t('february'), t('march'), t('april'), t('may'), t('june'), t('july'), t('august'), t('september'), t('october'), t('november'), t('december')]; const curMonth = new Date().getMonth(); monthSel.innerHTML = months.map((m, i) => `<option value="${i}" ${i === curMonth ? 'selected' : ''}>${m}</option>`).join(''); const curYear = new Date().getFullYear(); let yearOpts = ''; for (let i = curYear; i >= curYear - 5; i--) yearOpts += `<option value="${i}">${i}</option>`; yearSel.innerHTML = yearOpts; }

    // --- Settings - Backup/Restore ---
    DOMElements.backupBtn.addEventListener('click', () => { const wb = XLSX.utils.book_new(); const custMap = new Map(customers.map(c => [c.id, c.name])); const prodMap = new Map(products.map(p => [p.id, p.description])); const ordersExport = orders.map(({ customerId, id, items, ...rest }) => ({ customer: custMap.get(customerId) || 'N/A', items: items.map(item => `${item.quantity} x ${prodMap.get(item.productId)}`).join(', '), ...rest })); const toSheet = data => XLSX.utils.json_to_sheet(data.map(({id, ...rest}) => rest)); XLSX.utils.book_append_sheet(wb, toSheet(products), "Products"); XLSX.utils.book_append_sheet(wb, toSheet(customers), "Customers"); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ordersExport), "Orders"); XLSX.utils.book_append_sheet(wb, toSheet(payments), "Payments"); XLSX.writeFile(wb, "backup.xlsx"); });
    DOMElements.restoreBtn.addEventListener('click', () => DOMElements.restoreInput.click());
    DOMElements.restoreInput.addEventListener('change', e => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = async evt => { const data = new Uint8Array(evt.target.result); const workbook = XLSX.read(data, {type: 'array'}); if (confirm(t('restoreConfirm'))) { await restoreDataFromWorkbook(workbook); alert(t('restoreSuccess')); await initApp(); } }; reader.readAsArrayBuffer(file); });
    async function restoreDataFromWorkbook(workbook) { const userId = currentUser.uid; await upsertData(workbook, "Customers", "customers", "name", customers); await upsertData(workbook, "Products", "products", "description", products); const cSnap = await getDocs(collection(db, `users/${userId}/customers`)); customers = cSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })); const pSnap = await getDocs(collection(db, `users/${userId}/products`)); products = pSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })); await replaceData(workbook, "Orders", "orders", { customer: customers, product: products }); await replaceData(workbook, "Payments", "payments"); }
    async function upsertData(wb, sheet, coll, key, localData) { if (!wb.Sheets[sheet]) return; const jsonData = XLSX.utils.sheet_to_json(wb.Sheets[sheet]); const existing = new Set(localData.map(item => item[key])); const batch = writeBatch(db); jsonData.forEach(item => { if (item[key] && !existing.has(item[key])) { batch.set(doc(collection(db, `users/${currentUser.uid}/${coll}`)), item); } }); await batch.commit(); }
    async function replaceData(wb, sheet, coll, maps = {}) { if (!wb.Sheets[sheet]) return; const jsonData = XLSX.utils.sheet_to_json(wb.Sheets[sheet]); const ref = collection(db, `users/${currentUser.uid}/${coll}`); const existing = await getDocs(ref); const delBatch = writeBatch(db); existing.forEach(doc => delBatch.delete(doc.ref)); await delBatch.commit(); const addBatch = writeBatch(db); jsonData.forEach(item => { let newItem = { ...item }; if (maps.customer && item.customer) { const c = customers.find(c => c.name === item.customer); if (c) newItem.customerId = c.id; delete newItem.customer; } if (maps.product && item.product) { const p = products.find(p => p.description === item.product); if (p) newItem.productId = p.id; delete newItem.product; } addBatch.set(doc(ref), newItem); }); await addBatch.commit(); }

    // --- Dashboard ---
    function setupDashboard() { DOMElements.dashboardMonthSelect.addEventListener('change', updateDashboard); DOMElements.dashboardYearSelect.addEventListener('change', updateDashboard); updateDashboard(); }
    function updateDashboard() { const m = parseInt(DOMElements.dashboardMonthSelect.value), y = parseInt(DOMElements.dashboardYearSelect.value); const filtered = orders.filter(o => new Date(o.date).getMonth() === m && new Date(o.date).getFullYear() === y); DOMElements.totalPendingAmountEl.textContent = `$${orders.filter(o => o.status !== 'Paid').reduce((s, o) => s + (o.total - (o.amountPaid || 0)), 0).toFixed(2)}`; renderSalesChart(filtered, m, y); renderProductSalesChart(filtered); renderCustomerRankingChart(filtered); renderPendingOrders(orders); }
    function renderSalesChart(data, m, y) { const days = new Date(y, m + 1, 0).getDate(); const labels = Array.from({ length: days }, (_, i) => i + 1); const sales = new Array(days).fill(0); data.forEach(o => { sales[new Date(o.date).getDate() - 1] += o.total; }); const ctx = document.getElementById('sales-chart').getContext('2d'); if (salesChart) salesChart.destroy(); salesChart = new Chart(ctx, { type: 'line', data: { labels, datasets: [{ label: t('dailySales'), data: sales, borderColor: 'rgba(0, 123, 255, 1)', backgroundColor: 'rgba(0, 123, 255, 0.2)', fill: true }] }, options: { responsive: true } }); }
    function renderProductSalesChart(data) { const sales = {}; data.forEach(o => { o.items.forEach(item => { const name = products.find(p => p.id === item.productId)?.description || 'Unk'; sales[name] = (sales[name] || 0) + (products.find(p => p.id === item.productId)?.retailPrice || 0) * item.quantity; }); }); const labels = Object.keys(sales), values = Object.values(sales); const ctx = document.getElementById('product-sales-chart').getContext('2d'); if (productSalesChart) productSalesChart.destroy(); productSalesChart = new Chart(ctx, { type: 'pie', data: { labels, datasets: [{ data: values, backgroundColor: ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6c757d'] }] }, options: { responsive: true } }); }
    function renderCustomerRankingChart(data) { const sales = {}; data.forEach(o => { const name = customers.find(c => c.id === o.customerId)?.name || 'Unk'; sales[name] = (sales[name] || 0) + o.total; }); const sorted = Object.entries(sales).sort((a, b) => b[1] - a[1]); const labels = sorted.map(c => c[0]), values = sorted.map(c => c[1]); const ctx = document.getElementById('customer-ranking-chart').getContext('2d'); if (customerRankingChart) customerRankingChart.destroy(); customerRankingChart = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ label: t('customerRanking'), data: values, backgroundColor: '#28a745' }] }, options: { responsive: true, indexAxis: 'y' } }); }
    function renderPendingOrders(all) { DOMElements.pendingOrdersList.innerHTML = ''; const pending = all.filter(o => o.status !== 'Paid'); if (pending.length === 0) { DOMElements.pendingOrdersList.innerHTML = `<tr><td colspan="3">${t('noPendingPayments')}</td></tr>`; return; } pending.forEach(o => { const name = customers.find(c => c.id === o.customerId)?.name || 'N/A'; const rem = o.total - (o.amountPaid || 0); const age = Math.floor((new Date() - new Date(o.date)) / 864e5); DOMElements.pendingOrdersList.innerHTML += `<tr><td>${name}</td><td>$${rem.toFixed(2)}</td><td>${age} ${t('days')}</td></tr>`; }); }

    // --- Helpers & Autocomplete ---
    function populateSelect(id, data, valKey, txtKey, selVal, defaultOpt) { const sel = typeof id === 'string' ? document.getElementById(id) : id; sel.innerHTML = `<option value="">${defaultOpt || t('selectOption')}</option>`; data.forEach(item => { const opt = document.createElement('option'); opt.value = item[valKey]; opt.textContent = item[txtKey]; if (item[valKey] === selVal) opt.selected = true; sel.appendChild(opt); }); }
    const customerAutocompleteInput = document.getElementById('order-customer-autocomplete');
    const autocompleteResults = document.getElementById('autocomplete-results');
    customerAutocompleteInput.addEventListener('input', () => { const query = customerAutocompleteInput.value.toLowerCase(); autocompleteResults.innerHTML = ''; if (query.length < 2) return; customers.filter(c => c.name.toLowerCase().includes(query)).forEach(c => { const div = document.createElement('div'); div.textContent = c.name; div.addEventListener('click', () => { customerAutocompleteInput.value = c.name; document.getElementById('order-customer-id').value = c.id; autocompleteResults.innerHTML = ''; }); autocompleteResults.appendChild(div); }); });
    document.addEventListener('click', e => { if (!e.target.closest('.autocomplete')) autocompleteResults.innerHTML = ''; });
});
