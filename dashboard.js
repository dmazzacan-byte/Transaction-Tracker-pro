import { getOrders, getProducts, getCustomers } from './firebase.js';

let salesChart;

const renderDailySalesChart = (orders) => {
    const salesByDay = {};
    orders.forEach(order => {
        const date = order.date;
        salesByDay[date] = (salesByDay[date] || 0) + order.totalValue;
    });

    const sortedDates = Object.keys(salesByDay).sort();
    const chartData = sortedDates.map(date => salesByDay[date]);

    const ctx = document.getElementById('sales-chart').getContext('2d');
    if (salesChart) {
        salesChart.destroy();
    }
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [{
                label: 'Ventas Diarias',
                data: chartData,
                borderColor: '#3498db',
                tension: 0.1
            }]
        }
    });
};

const renderPendingPaymentsTable = (orders, customers) => {
    const tableBody = document.querySelector('#pending-payments-table tbody');
    tableBody.innerHTML = '';
    orders
        .filter(order => order.paymentStatus !== 'Pagado')
        .forEach(order => {
            const customerName = customers[order.customerId]?.name || 'N/A';
            const row = `
                <tr>
                    <td>${customerName}</td>
                    <td>${order.totalValue - order.amountPaid}</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
};

const renderProductSalesTable = (orders, products) => {
    const tableBody = document.querySelector('#product-sales-table tbody');
    tableBody.innerHTML = '';
    const salesByProduct = {};

    orders.forEach(order => {
        const productId = order.productId;
        salesByProduct[productId] = (salesByProduct[productId] || 0) + order.quantity;
    });

    for (const productId in salesByProduct) {
        const productName = products[productId]?.description || 'N/A';
        const row = `
            <tr>
                <td>${productName}</td>
                <td>${salesByProduct[productId]}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    }
};

const fetchData = async () => {
    const [ordersSnapshot, productsSnapshot, customersSnapshot] = await Promise.all([getOrders(), getProducts(), getCustomers()]);

    const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const products = {};
    productsSnapshot.forEach(doc => products[doc.id] = doc.data());

    const customers = {};
    customersSnapshot.forEach(doc => customers[doc.id] = doc.data());

    renderDailySalesChart(orders);
    renderPendingPaymentsTable(orders, customers);
    renderProductSalesTable(orders, products);
};

export const initDashboard = () => {
    fetchData();
};