import { getState } from '../state.js';
import { t } from '../utils/i18n.js';

export function renderAll() {
    renderProducts();
    renderCustomers();
    renderOrders();
    renderPayments();
    renderUsers();
}

export function renderProducts(searchTerm = '') {
    const { products } = getState();
    const tableBody = document.getElementById('products-table-body');
    if (!tableBody) return;
    const filtered = products.filter(p => p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    filtered.sort((a, b) => (a.description || '').localeCompare(b.description || ''));

    const rowsHtml = filtered.map(p => {
        const retailPrice = typeof p.retailPrice === 'number' ? p.retailPrice.toFixed(2) : '0.00';
        const wholesalePrice = typeof p.wholesalePrice === 'number' ? p.wholesalePrice.toFixed(2) : '0.00';
        return `
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
    }).join('');

    tableBody.innerHTML = rowsHtml;
}

export function renderCustomers(searchTerm = '') {
    const { customers, orders } = getState();
    const tableBody = document.getElementById('customers-table-body');
    if (!tableBody || !customers) return;

    const filtered = customers.filter(c => c && c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    const rowsHtml = filtered.map(c => {
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
                <td>$${(monthlyVolume || 0).toFixed(2)}</td>
                <td>$${(historicalVolume || 0).toFixed(2)}</td>
                <td>$${(pendingAmount || 0).toFixed(2)}</td>
                <td>
                    <button class="action-btn edit" data-id="${c.id}" data-type="customer" title="${t('edit')}"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" data-id="${c.id}" data-type="customer" title="${t('delete')}"><i class="fas fa-trash"></i></button>
                    <button class="action-btn whatsapp-btn" data-id="${c.id}" data-type="customer" data-pending-amount="${pendingAmount.toFixed(2)}" title="Send WhatsApp"><i class="fab fa-whatsapp"></i></button>
                </td>
            </tr>
        `;
    }).join('');

    tableBody.innerHTML = rowsHtml;
}

export function renderOrders(searchTerm = '', customerId, month, year) {
    const { orders, customers, products } = getState();
    const tableBody = document.getElementById('orders-table-body');
    if (!tableBody || !orders) return;

    let filtered = orders.filter(o => {
        if (!o || !o.date) return false;
        const orderDate = new Date(o.date);
        return !isNaN(orderDate.getTime());
    });

    if (customerId) filtered = filtered.filter(o => o.customerId === customerId);
    if (month) filtered = filtered.filter(o => new Date(o.date).getMonth() == month);
    if (year) filtered = filtered.filter(o => new Date(o.date).getFullYear() == year);

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    const rowsHtml = filtered.map(o => {
        const customer = customers.find(c => c && c.id === o.customerId)?.name || 'N/A';
        const items = Array.isArray(o.items) ? o.items : [];
        const itemsSummary = items.map(item => {
            const product = products.find(p => p && p.id === item.productId);
            return `${parseInt(item.quantity) || 0} x ${product ? (product.description || 'N/A') : 'N/A'}`;
        }).join('<br>');
        const status = o.status || 'N/A';
        const statusClass = `status-${status.toLowerCase()}`;

        return `
            <tr>
                <td>${new Date(o.date).toLocaleDateString()}</td>
                <td>${customer}</td>
                <td>${itemsSummary}</td>
                <td>$${(parseFloat(o.total) || 0).toFixed(2)}</td>
                <td>$${(parseFloat(o.amountPaid) || 0).toFixed(2)}</td>
                <td><span class="status ${statusClass}">${t(status.toLowerCase())}</span></td>
                <td>
                    <button class="action-btn edit" data-id="${o.id}" data-type="order" title="${t('edit')}"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" data-id="${o.id}" data-type="order" title="${t('delete')}"><i class="fas fa-trash"></i></button>
                    <button class="action-btn pay" data-id="${o.id}" data-type="order" title="${t('pay')}"><i class="fas fa-dollar-sign"></i></button>
                    <button class="action-btn whatsapp-btn" data-id="${o.id}" data-type="order" title="Send WhatsApp"><i class="fab fa-whatsapp"></i></button>
                </td>
            </tr>
        `;
    }).join('');

    tableBody.innerHTML = rowsHtml;
}

export function renderPayments(customerId, month, year) {
    const { payments, orders, customers } = getState();
    const tableBody = document.getElementById('payments-table-body');
    if (!tableBody || !payments) return;

    let filtered = payments.filter(p => {
        if (!p || !p.date) return false;
        const paymentDate = new Date(p.date);
        return !isNaN(paymentDate.getTime());
    });

    if (customerId) {
        const customerOrderIds = new Set(orders.filter(o => o.customerId === customerId).map(o => o.id));
        filtered = filtered.filter(p => customerOrderIds.has(p.orderId));
    }
    if (month) filtered = filtered.filter(p => new Date(p.date).getMonth() == month);
    if (year) filtered = filtered.filter(p => new Date(p.date).getFullYear() == year);

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    const rowsHtml = filtered.map(p => {
        const order = orders.find(o => o && o.id === p.orderId);
        const customer = customers.find(c => c && c.id === order?.customerId)?.name || 'N/A';
        const orderId = order ? `Order #${order.id.substring(0, 5)}...` : 'N/A';

        return `
            <tr>
                <td>${new Date(p.date).toLocaleDateString()}</td>
                <td>${customer}</td>
                <td>${orderId}</td>
                <td>$${(parseFloat(p.amount) || 0).toFixed(2)}</td>
                <td>${p.reference || ''}</td>
                <td>
                    <button class="action-btn edit" data-id="${p.id}" data-type="payment" title="${t('edit')}"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" data-id="${p.id}" data-type="payment" title="${t('delete')}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');

    tableBody.innerHTML = rowsHtml;
}

export function renderUsers() {
    const { users } = getState();
    const tableBody = document.getElementById('users-table-body');
    tableBody.innerHTML = '';
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
        tableBody.innerHTML += row;
    });
}
