import { getState, setState } from '../state.js';
import { saveProfitPercentage } from '../services/profitability.js';

let currentYear, currentMonth;

export function setupProfitabilityTable(year, month) {
    currentYear = year;
    currentMonth = month;
    renderProfitabilityTable();

    const tableBody = document.getElementById('profitability-table-body');
    if (tableBody) {
        tableBody.addEventListener('change', handlePercentageChange);
    }
}

async function handlePercentageChange(event) {
    if (event.target.classList.contains('profit-percentage')) {
        const productId = event.target.dataset.productId;
        const percentage = parseFloat(event.target.value);

        if (!isNaN(percentage)) {
            await saveProfitPercentage(currentYear, currentMonth, productId, percentage);

            // Update local state to reflect the change immediately
            const { profitability } = getState();
            const updatedProfitability = { ...profitability, [productId]: percentage };
            setState({ profitability: updatedProfitability });

            // Re-render to update the "Ganancia" column and totals
            renderProfitabilityTable();
        }
    }
}


export function renderProfitabilityTable() {
    const { orders, products, profitability } = getState();

    const filteredOrders = orders.filter(o => {
        const orderDate = new Date(o.date);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
    });

    const salesByProduct = {};
    filteredOrders.forEach(order => {
        if (Array.isArray(order.items)) {
            order.items.forEach(item => {
                const itemTotal = item.price * item.quantity;
                salesByProduct[item.productId] = (salesByProduct[item.productId] || 0) + itemTotal;
            });
        }
    });

    const tableBody = document.getElementById('profitability-table-body');
    const tableFooter = document.getElementById('profitability-table-footer');
    if (!tableBody || !tableFooter) return;

    tableBody.innerHTML = '';
    let totalSales = 0;
    let totalProfit = 0;

    const sortedProducts = [...products].sort((a, b) => {
        const salesA = salesByProduct[a.id] || 0;
        const salesB = salesByProduct[b.id] || 0;
        return salesB - salesA;
    });


    sortedProducts.forEach(product => {
        const sales = salesByProduct[product.id] || 0;
        if (sales === 0) return; // Don't show products with no sales in the selected month

        const percentage = profitability[product.id] || 0;
        const profit = sales * (percentage / 100);

        totalSales += sales;
        totalProfit += profit;

        const row = `
            <tr>
                <td>${product.description}</td>
                <td><input type="number" class="profit-percentage" data-product-id="${product.id}" value="${percentage}" step="0.01"></td>
                <td>$${sales.toFixed(2)}</td>
                <td>$${profit.toFixed(2)}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });

    const weightedProfitPercentage = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

    tableFooter.innerHTML = `
        <tr>
            <td colspan="2"><strong>Totales</strong></td>
            <td><strong>$${totalSales.toFixed(2)}</strong></td>
            <td><strong>$${totalProfit.toFixed(2)}</strong></td>
        </tr>
        <tr>
            <td colspan="3"><strong>% Ganancia Ponderado</strong></td>
            <td><strong>${weightedProfitPercentage.toFixed(2)}%</strong></td>
        </tr>
    `;
}
