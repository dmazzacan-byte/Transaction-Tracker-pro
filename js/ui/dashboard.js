import { getState, setState } from '../state.js';
import { setupProfitabilityTable, renderProfitabilityTable } from './profitability.js';
import { getProfitabilityForMonth } from '../services/profitability.js';

let salesChart, productSalesChart, customerRankingChart;

export function setupDashboard() {
    populateDateFilters();
    updateDashboard();

    const month = parseInt(document.getElementById('dashboard-month').value);
    const year = parseInt(document.getElementById('dashboard-year').value);
    setupProfitabilityTable(year, month);


    document.getElementById('dashboard-month').addEventListener('change', updateDashboard);
    document.getElementById('dashboard-year').addEventListener('change', updateDashboard);
}

function populateDateFilters() {
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const currentMonth = new Date().getMonth();
    const select = document.getElementById('dashboard-month');
    select.innerHTML = months.map((m, i) => `<option value="${i}" ${i === currentMonth ? 'selected' : ''}>${m}</option>`).join('');

    const currentYear = new Date().getFullYear();
    const yearSelect = document.getElementById('dashboard-year');
    let yearOptions = '';
    for (let i = currentYear; i >= currentYear - 5; i--) {
        yearOptions += `<option value="${i}">${i}</option>`;
    }
    yearSelect.innerHTML = yearOptions;
}

export async function updateDashboard() {
    const month = parseInt(document.getElementById('dashboard-month').value);
    const year = parseInt(document.getElementById('dashboard-year').value);

    const profitability = await getProfitabilityForMonth(year, month);
    setState({ profitability });
    setupProfitabilityTable(year, month);

    const { orders } = getState();

    const filteredOrders = orders.filter(o => {
        const orderDate = new Date(o.date);
        return orderDate.getMonth() === month && orderDate.getFullYear() === year;
    });

    renderSalesChart(filteredOrders, month, year);
    renderProductSalesChart(filteredOrders);
    renderPendingOrders(orders);
    renderCustomerRankingChart(filteredOrders);
    renderProfitabilityTable();
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
            labels: labels,
            datasets: [{
                label: 'Ventas Diarias',
                data: salesData,
                backgroundColor: 'rgba(0, 123, 255, 0.6)',
                yAxisID: 'y',
            }, {
                label: 'Ventas Acumuladas',
                data: cumulativeSalesData,
                type: 'line',
                borderColor: 'rgba(40, 167, 69, 1)',
                yAxisID: 'y1',
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { position: 'left', title: { display: true, text: 'Ventas Diarias' }},
                y1: { position: 'right', title: { display: true, text: 'Ventas Acumuladas' }, grid: { drawOnChartArea: false } },
            },
            plugins: {
                datalabels: {
                    display: false // Ocultar etiquetas en este gráfico
                }
            }
        }
    });
}

function renderProductSalesChart(filteredOrders) {
    const { products } = getState();
    const productSales = {};
    filteredOrders.forEach(o => {
        if (Array.isArray(o.items)) {
            o.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                const productName = product ? product.description : 'Desconocido';
                const itemTotal = item.price * item.quantity;
                productSales[productName] = (productSales[productName] || 0) + itemTotal;
            });
        }
    });

    const chartData = Object.values(productSales);
    const totalSales = chartData.reduce((a, b) => a + b, 0);
    const SMALL_SLICE_PERCENTAGE = 7; // Threshold to move labels outside

    const ctx = document.getElementById('product-sales-chart').getContext('2d');
    if (productSalesChart) productSalesChart.destroy();
    productSalesChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(productSales),
            datasets: [{
                data: chartData,
                backgroundColor: ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6c757d'],
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                },
                tooltip: {
                    enabled: true // Re-enabling tooltips is generally better UX
                },
                datalabels: {
                    formatter: (value, ctx) => {
                        if (totalSales === 0) return null;
                        const percentage = (value / totalSales) * 100;
                        return `$${value.toFixed(2)}\n(${percentage.toFixed(1)}%)`;
                    },
                    color: (ctx) => {
                        const percentage = (ctx.dataset.data[ctx.dataIndex] / totalSales) * 100;
                        return percentage < SMALL_SLICE_PERCENTAGE ? '#000' : '#fff';
                    },
                    textAlign: 'center',
                    font: {
                        weight: 'bold'
                    },
                    // Conditional positioning for small slices
                    anchor: (ctx) => {
                        const percentage = (ctx.dataset.data[ctx.dataIndex] / totalSales) * 100;
                        return percentage < SMALL_SLICE_PERCENTAGE ? 'end' : 'center';
                    },
                    align: (ctx) => {
                        const percentage = (ctx.dataset.data[ctx.dataIndex] / totalSales) * 100;
                        return percentage < SMALL_SLICE_PERCENTAGE ? 'end' : 'center';
                    },
                    offset: 4
                }
            }
        }
    });
}

function renderCustomerRankingChart(filteredOrders) {
    const { customers } = getState();
    const customerSales = {};
    filteredOrders.forEach(o => {
        const customerName = customers.find(c => c.id === o.customerId)?.name || 'Desconocido';
        customerSales[customerName] = (customerSales[customerName] || 0) + o.total;
    });

    const sortedCustomers = Object.entries(customerSales).sort(([,a],[,b]) => b-a);

    const ctx = document.getElementById('customer-ranking-chart').getContext('2d');
    if (customerRankingChart) customerRankingChart.destroy();
    customerRankingChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedCustomers.map(([name]) => name),
            datasets: [{
                label: 'Ventas',
                data: sortedCustomers.map(([,total]) => total),
                backgroundColor: '#28a745',
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            plugins: {
                datalabels: {
                    anchor: 'end',
                    align: 'end',
                    formatter: (value) => `$${value.toFixed(2)}`,
                    color: 'black',
                    font: {
                        weight: 'bold'
                    }
                }
            }
        }
    });
}

function renderPendingOrders(allOrders) {
    const { customers } = getState();
    const tableBody = document.getElementById('pending-payments-table-body');
    if (!tableBody) return;

    const pending = allOrders.filter(o => o.status !== 'Paid' && o.total > (o.amountPaid || 0));
    const totalPending = pending.reduce((sum, o) => sum + (o.total - (o.amountPaid || 0)), 0);

    const cardHeader = tableBody.closest('.card')?.querySelector('h3');
    if (cardHeader) {
        cardHeader.textContent = `Pagos Pendientes ($${totalPending.toFixed(2)})`;
    }

    tableBody.innerHTML = '';
    if (pending.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4">No hay pagos pendientes</td></tr>`;
        return;
    }

    pending.sort((a, b) => new Date(a.date) - new Date(b.date));
    pending.forEach(o => {
        const customerName = customers.find(c => c.id === o.customerId)?.name || 'N/A';
        const remaining = o.total - (o.amountPaid || 0);
        const daysOld = Math.floor((new Date() - new Date(o.date)) / (1000 * 60 * 60 * 24));
        const row = `
            <tr>
                <td>${customerName}</td>
                <td>$${remaining.toFixed(2)}</td>
                <td>${daysOld} días</td>
                <td>
                    <button class="action-btn whatsapp-btn" data-id="${o.customerId}" data-type="pending-payment" data-amount="${remaining.toFixed(2)}" data-days-old="${daysOld}" title="Enviar Recordatorio"><i class="fab fa-whatsapp"></i></button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}
