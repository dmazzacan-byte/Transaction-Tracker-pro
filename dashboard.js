import { getOrders, getCustomers, getProducts } from './firebase.js';

const monthFilter = document.getElementById('month-filter');
const yearFilter = document.getElementById('year-filter');
const salesChartCanvas = document.getElementById('sales-chart');
const pendingPaymentsTableBody = document.querySelector('#pending-payments-table tbody');
const productSalesTableBody = document.querySelector('#product-sales-table tbody');
let salesChart;

const populateFilters = () => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    months.forEach((month, i) => {
        const option = `<option value="${i}">${month}</option>`;
        monthFilter.innerHTML += option;
    });

    const currentYear = new Date().getFullYear();
    for (let i = currentYear; i >= currentYear - 5; i--) {
        const option = `<option value="${i}">${i}</option>`;
        yearFilter.innerHTML += option;
    }

    monthFilter.value = new Date().getMonth();
    yearFilter.value = currentYear;
};

const renderDashboard = async () => {
    const selectedMonth = parseInt(monthFilter.value);
    const selectedYear = parseInt(yearFilter.value);

    const [ordersSnapshot, customersSnapshot, productsSnapshot] = await Promise.all([getOrders(), getCustomers(), getProducts()]);
    const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const customers = customersSnapshot.docs.reduce((acc, doc) => ({ ...acc, [doc.id]: doc.data() }), {});
    const products = productsSnapshot.docs.reduce((acc, doc) => ({ ...acc, [doc.id]: doc.data() }), {});

    const filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.date);
        return orderDate.getMonth() === selectedMonth && orderDate.getFullYear() === selectedYear;
    });

    renderSalesChart(filteredOrders);
    renderPendingPayments(filteredOrders, customers);
    renderProductSales(filteredOrders, products);
};

const renderSalesChart = (orders) => {
    const dailySales = {};
    orders.forEach(order => {
        const day = new Date(order.date).getDate();
        dailySales[day] = (dailySales[day] || 0) + order.total;
    });

    const chartData = {
        labels: Object.keys(dailySales),
        datasets: [{
            label: 'Daily Sales',
            data: Object.values(dailySales),
            backgroundColor: 'rgba(52, 152, 219, 0.5)',
            borderColor: 'rgba(52, 152, 219, 1)',
            borderWidth: 1
        }]
    };

    if (salesChart) {
        salesChart.destroy();
    }

    salesChart = new Chart(salesChartCanvas, {
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
};

const renderPendingPayments = (orders, customers) => {
    pendingPaymentsTableBody.innerHTML = '';
    const pending = orders.filter(o => o.status !== 'Pagado');
    pending.forEach(order => {
        const customerName = customers[order.customerId]?.name || 'N/A';
        const dueAmount = order.total - order.paid;
        if (dueAmount > 0) {
            const row = `
                <tr>
                    <td>${customerName}</td>
                    <td>${dueAmount.toFixed(2)}</td>
                </tr>
            `;
            pendingPaymentsTableBody.innerHTML += row;
        }
    });
};

const renderProductSales = (orders, products) => {
    productSalesTableBody.innerHTML = '';
    const sales = {};
    orders.forEach(order => {
        const productName = products[order.productId]?.description || 'N/A';
        sales[productName] = (sales[productName] || 0) + order.quantity;
    });

    for (const [productName, quantity] of Object.entries(sales)) {
        const row = `
            <tr>
                <td>${productName}</td>
                <td>${quantity}</td>
            </tr>
        `;
        productSalesTableBody.innerHTML += row;
    }
};

export const initDashboard = async () => {
    populateFilters();
    await renderDashboard();
    monthFilter.addEventListener('change', renderDashboard);
    yearFilter.addEventListener('change', renderDashboard);
};
