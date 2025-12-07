
import { t, formatCurrency } from './utils.js';

let salesChart, productSalesChart, customerRankingChart;

function renderProducts(products, searchTerm = '') {
    const productsTableBody = document.getElementById('products-table-body');
    const filteredProducts = products
        .filter(p => p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => (a.description || '').localeCompare(b.description || ''));

    const productsHTML = filteredProducts.map(p => `
        <tr>
            <td>${p.description || 'N/A'}</td>
            <td>${formatCurrency(p.retailPrice)}</td>
            <td>${formatCurrency(p.wholesalePrice)}</td>
            <td>
                <button class="action-btn edit" data-id="${p.id}" data-type="product" title="${t('edit')}"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete" data-id="${p.id}" data-type="product" title="${t('delete')}"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');

    productsTableBody.innerHTML = productsHTML;
}

function renderCustomers(customers, orders, searchTerm = '') {
    const customersTableBody = document.getElementById('customers-table-body');
    if (!customers) {
        customersTableBody.innerHTML = '';
        return;
    }

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const filteredCustomers = customers
        .filter(c => c && c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    const customersHTML = filteredCustomers.map(c => {
        const customerOrders = orders ? orders.filter(o => o && o.customerId === c.id) : [];
        const historicalVolume = customerOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
        const monthlyVolume = customerOrders
            .filter(o => {
                if (!o.date) return false;
                const orderDate = new Date(o.date);
                return !isNaN(orderDate.getTime()) && orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
            })
            .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
        const pendingAmount = customerOrders
            .filter(o => o.status !== 'Paid')
            .reduce((sum, o) => sum + ((parseFloat(o.total) || 0) - (parseFloat(o.amountPaid) || 0)), 0);

        return `
            <tr>
                <td>${c.name || 'N/A'}</td>
                <td>${c.phone || ''}</td>
                <td>${formatCurrency(monthlyVolume)}</td>
                <td>${formatCurrency(historicalVolume)}</td>
                <td>${formatCurrency(pendingAmount)}</td>
                <td>
                    <button class="action-btn edit" data-id="${c.id}" data-type="customer" title="${t('edit')}"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" data-id="${c.id}" data-type="customer" title="${t('delete')}"><i class="fas fa-trash"></i></button>
                    <button class="action-btn whatsapp-btn" data-id="${c.id}" data-type="customer" data-pending-amount="${pendingAmount.toFixed(2)}" title="Send WhatsApp"><i class="fab fa-whatsapp"></i></button>
                </td>
            </tr>
        `;
    }).join('');

    customersTableBody.innerHTML = customersHTML;
}

function renderOrders(orders, customers, products, { customerId, month, year }) {
    const ordersTableBody = document.getElementById('orders-table-body');
    if (!orders) {
        ordersTableBody.innerHTML = '';
        return;
    }

    let filteredOrders = orders.filter(o => o && o.date && !isNaN(new Date(o.date).getTime()));

    if (customerId) filteredOrders = filteredOrders.filter(o => o.customerId === customerId);
    if (month) filteredOrders = filteredOrders.filter(o => new Date(o.date).getMonth() == month);
    if (year) filteredOrders = filteredOrders.filter(o => new Date(o.date).getFullYear() == year);

    filteredOrders.sort((a, b) => new Date(b.date) - new Date(a.date));

    const ordersHTML = filteredOrders.map(o => {
        const customer = customers.find(c => c && c.id === o.customerId)?.name || 'N/A';
        const itemsSummary = (Array.isArray(o.items) ? o.items : [])
            .map(item => {
                const product = products.find(p => p && p.id === item.productId);
                return `${parseInt(item.quantity) || 0} x ${product ? (product.description || 'N/A') : 'N/A'}`;
            }).join('<br>');
        const statusClass = `status-${(o.status || 'N/A').toLowerCase()}`;

        return `
            <tr>
                <td>${new Date(o.date).toLocaleDateString()}</td>
                <td>${customer}</td>
                <td>${itemsSummary}</td>
                <td>${formatCurrency(o.total)}</td>
                <td>${formatCurrency(o.amountPaid)}</td>
                <td><span class="status ${statusClass}">${t((o.status || 'N/A').toLowerCase())}</span></td>
                <td>
                    <button class="action-btn edit" data-id="${o.id}" data-type="order" title="${t('edit')}"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" data-id="${o.id}" data-type="order" title="${t('delete')}"><i class="fas fa-trash"></i></button>
                    <button class="action-btn pay" data-id="${o.id}" data-type="order" title="${t('pay')}"><i class="fas fa-dollar-sign"></i></button>
                    <button class="action-btn whatsapp-btn" data-id="${o.id}" data-type="order" title="Send WhatsApp"><i class="fab fa-whatsapp"></i></button>
                </td>
            </tr>
        `;
    }).join('');

    ordersTableBody.innerHTML = ordersHTML;
}

function renderPayments(payments, orders, customers, { customerId, month, year }) {
    const paymentsTableBody = document.getElementById('payments-table-body');
    if (!payments) {
        paymentsTableBody.innerHTML = '';
        return;
    }

    let filteredPayments = payments.filter(p => p && p.date && !isNaN(new Date(p.date).getTime()));

    if (customerId) {
        const customerOrderIds = new Set(orders.filter(o => o.customerId === customerId).map(o => o.id));
        filteredPayments = filteredPayments.filter(p => customerOrderIds.has(p.orderId));
    }
    if (month) filteredPayments = filteredPayments.filter(p => new Date(p.date).getMonth() == month);
    if (year) filteredPayments = filteredPayments.filter(p => new Date(p.date).getFullYear() == year);

    filteredPayments.sort((a, b) => new Date(b.date) - new Date(a.date));

    const paymentsHTML = filteredPayments.map(p => {
        const order = orders.find(o => o && o.id === p.orderId);
        const customer = customers.find(c => c && c.id === order?.customerId)?.name || 'N/A';
        const orderId = order ? `Order #${order.id.substring(0, 5)}...` : 'N/A';

        return `
            <tr>
                <td>${new Date(p.date).toLocaleDateString()}</td>
                <td>${customer}</td>
                <td>${orderId}</td>
                <td>${formatCurrency(p.amount)}</td>
                <td>${p.reference || ''}</td>
                <td>
                    <button class="action-btn edit" data-id="${p.id}" data-type="payment" title="${t('edit')}"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" data-id="${p.id}" data-type="payment" title="${t('delete')}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');

    paymentsTableBody.innerHTML = paymentsHTML;
}

function renderUsers(users) {
    const usersTableBody = document.getElementById('users-table-body');
    const usersHTML = users.map(u => `
        <tr>
            <td>${u.name || u.email.split('@')[0]}</td>
            <td>${u.email}</td>
            <td>
                 <button class="action-btn delete" data-id="${u.id}" data-type="user" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
    usersTableBody.innerHTML = usersHTML;
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
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: t('daily_sales'), data: salesData, backgroundColor: 'rgba(0, 123, 255, 0.6)', yAxisID: 'y' },
                { label: t('cumulative_sales'), data: cumulativeSalesData, type: 'line', borderColor: 'rgba(40, 167, 69, 1)', tension: 0.1, yAxisID: 'y1' }
            ]
        },
        options: { responsive: true, interaction: { mode: 'index', intersect: false }, scales: { y: { position: 'left' }, y1: { position: 'right', grid: { drawOnChartArea: false } } } }
    });
}

function renderProductSalesChart(filteredOrders, products) {
    const productSales = {};
    filteredOrders.forEach(o => {
        if (Array.isArray(o.items)) {
            o.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                const productName = product ? product.description : 'Unknown';
                productSales[productName] = (productSales[productName] || 0) + (item.price * item.quantity);
            });
        }
    });
    const labels = Object.keys(productSales);
    const data = Object.values(productSales);
    const ctx = document.getElementById('product-sales-chart').getContext('2d');
    if (productSalesChart) productSalesChart.destroy();
    productSalesChart = new Chart(ctx, {
        type: 'pie',
        data: { labels, datasets: [{ data, backgroundColor: ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6c757d'] }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'left' }, datalabels: { formatter: (value, ctx) => {
            const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            return total > 0 ? `${(value / total * 100).toFixed(2)}%` : '0%';
        }, color: '#fff'}}}
    });
}

function renderCustomerRankingChart(filteredOrders, customers) {
    const customerSales = {};
    filteredOrders.forEach(o => {
        const customerName = customers.find(c => c.id === o.customerId)?.name || 'Unknown';
        customerSales[customerName] = (customerSales[customerName] || 0) + o.total;
    });
    const sortedCustomers = Object.entries(customerSales).sort(([, a], [, b]) => b - a);
    const labels = sortedCustomers.map(([name]) => name);
    const data = sortedCustomers.map(([, total]) => total);
    const ctx = document.getElementById('customer-ranking-chart').getContext('2d');
    if (customerRankingChart) customerRankingChart.destroy();
    customerRankingChart = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: t('sales'), data, backgroundColor: '#28a745' }] },
        options: { responsive: true, indexAxis: 'y' }
    });
}

function renderPendingOrders(allOrders, customers) {
    const pendingPaymentsTableBody = document.getElementById('pending-payments-table-body');
    if (!pendingPaymentsTableBody) return;
    const pending = allOrders.filter(o => o.status !== 'Paid' && o.total > (o.amountPaid || 0));
    const totalPendingAmount = pending.reduce((sum, o) => sum + (o.total - (o.amountPaid || 0)), 0);
    const cardHeader = pendingPaymentsTableBody.closest('.card')?.querySelector('h3');
    if (cardHeader) cardHeader.textContent = `${t('pending_payments')} (${formatCurrency(totalPendingAmount)})`;

    if (pending.length === 0) {
        pendingPaymentsTableBody.innerHTML = `<tr><td colspan="4">${t('no_pending_payments')}</td></tr>`;
        return;
    }

    pending.sort((a, b) => new Date(a.date) - new Date(b.date));
    const pendingHTML = pending.map(o => {
        const customerName = customers.find(c => c.id === o.customerId)?.name || 'N/A';
        const remaining = o.total - (o.amountPaid || 0);
        const daysOld = Math.floor((new Date() - new Date(o.date)) / (1000 * 60 * 60 * 24));
        return `
            <tr>
                <td>${customerName}</td>
                <td>${formatCurrency(remaining)}</td>
                <td>${daysOld} ${t('days_old')}</td>
                <td>
                    <button class="action-btn whatsapp-btn" data-id="${o.customerId}" data-type="pending-payment" data-amount="${remaining.toFixed(2)}" data-days-old="${daysOld}" title="Send WhatsApp Reminder">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    pendingPaymentsTableBody.innerHTML = pendingHTML;
}

function setupDashboard(orders, customers, products) {
    const dashboardMonthSelect = document.getElementById('dashboard-month');
    const dashboardYearSelect = document.getElementById('dashboard-year');

    const update = () => {
        const month = parseInt(dashboardMonthSelect.value);
        const year = parseInt(dashboardYearSelect.value);
        const filteredOrders = orders.filter(o => {
            const orderDate = new Date(o.date);
            return orderDate.getMonth() === month && orderDate.getFullYear() === year;
        });
        renderSalesChart(filteredOrders, month, year);
        renderProductSalesChart(filteredOrders, products);
        renderCustomerRankingChart(filteredOrders, customers);
    };

    dashboardMonthSelect.addEventListener('change', update);
    dashboardYearSelect.addEventListener('change', update);

    // Initial render
    renderPendingOrders(orders, customers);
    update();
}

export function renderUI(state) {
    const { products, customers, orders, payments, users, filters } = state;
    renderProducts(products, filters.productSearch);
    renderCustomers(customers, orders, filters.customerSearch);
    renderOrders(orders, customers, products, filters.orderFilters);
    renderPayments(payments, orders, customers, filters.paymentFilters);
    renderUsers(users);
    setupDashboard(orders, customers, products);
}
