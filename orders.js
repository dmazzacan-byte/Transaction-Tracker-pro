import { addOrder, getOrders, updateOrder, deleteOrder, getCustomers, getProducts } from './firebase.js';

const orderModal = document.getElementById('order-modal');
const orderForm = document.getElementById('order-form');
const ordersTableBody = document.querySelector('#orders-table tbody');
const modalTitle = document.getElementById('order-modal-title');
const customerSelect = document.getElementById('order-customer');
const productSelect = document.getElementById('order-product');

const populateSelect = (selectElement, items) => {
    selectElement.innerHTML = '<option value="">Select an option</option>';
    items.forEach(item => {
        const option = `<option value="${item.id}">${item.name || item.description}</option>`;
        selectElement.innerHTML += option;
    });
};

const openModal = async (title = 'Add Order', order = {}) => {
    modalTitle.textContent = title;
    orderForm.reset();
    orderForm['order-id'].value = order.id || '';
    orderForm['order-date'].value = order.date || new Date().toISOString().slice(0, 10);
    orderForm['order-quantity'].value = order.quantity || '';
    orderForm['order-total'].value = order.total || '';
    orderForm['order-paid'].value = order.paid || '';
    orderForm['order-status'].value = order.status || 'Pendiente';

    const customersSnapshot = await getCustomers();
    const customers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    populateSelect(customerSelect, customers);
    customerSelect.value = order.customerId || '';

    const productsSnapshot = await getProducts();
    const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    populateSelect(productSelect, products);
    productSelect.value = order.productId || '';

    orderModal.style.display = 'block';
};

const closeModal = () => {
    orderModal.style.display = 'none';
};

const renderOrders = async () => {
    ordersTableBody.innerHTML = '';
    const [ordersSnapshot, customersSnapshot, productsSnapshot] = await Promise.all([getOrders(), getCustomers(), getProducts()]);

    const customers = customersSnapshot.docs.reduce((acc, doc) => ({ ...acc, [doc.id]: doc.data() }), {});
    const products = productsSnapshot.docs.reduce((acc, doc) => ({ ...acc, [doc.id]: doc.data() }), {});

    ordersSnapshot.forEach(doc => {
        const order = { id: doc.id, ...doc.data() };
        const customerName = customers[order.customerId]?.name || 'N/A';
        const productName = products[order.productId]?.description || 'N/A';
        const row = `
            <tr>
                <td>${order.date}</td>
                <td>${customerName}</td>
                <td>${productName}</td>
                <td>${order.quantity}</td>
                <td>${order.total}</td>
                <td>${order.paid}</td>
                <td>${order.status}</td>
                <td class="actions">
                    <a href="#" class="edit-btn" data-id="${order.id}">Edit</a>
                    <a href="#" class="delete-btn" data-id="${order.id}">Delete</a>
                </td>
            </tr>
        `;
        ordersTableBody.innerHTML += row;
    });
};

const handleFormSubmit = async (e) => {
    e.preventDefault();
    const id = orderForm['order-id'].value;
    const orderData = {
        date: orderForm['order-date'].value,
        customerId: orderForm['order-customer'].value,
        productId: orderForm['order-product'].value,
        quantity: parseInt(orderForm['order-quantity'].value),
        total: parseFloat(orderForm['order-total'].value),
        paid: parseFloat(orderForm['order-paid'].value),
        status: orderForm['order-status'].value,
    };

    try {
        if (id) {
            await updateOrder(id, orderData);
        } else {
            await addOrder(orderData);
        }
        closeModal();
        await renderOrders();
    } catch (error) {
        console.error('Error saving order:', error);
    }
};

const handleTableClick = async (e) => {
    const target = e.target;
    const id = target.dataset.id;

    if (target.classList.contains('edit-btn')) {
        e.preventDefault();
        const doc = await getOrders().then(snapshot => snapshot.docs.find(doc => doc.id === id));
        if (doc) {
            const order = { id: doc.id, ...doc.data() };
            await openModal('Edit Order', order);
        }
    } else if (target.classList.contains('delete-btn')) {
        e.preventDefault();
        if (confirm('Are you sure you want to delete this order?')) {
            try {
                await deleteOrder(id);
                await renderOrders();
            } catch (error) {
                console.error('Error deleting order:', error);
            }
        }
    }
};

export const initOrders = async () => {
    document.getElementById('add-order-btn').addEventListener('click', () => openModal());
    orderModal.querySelector('.close-button').addEventListener('click', closeModal);
    orderForm.addEventListener('submit', handleFormSubmit);
    ordersTableBody.addEventListener('click', handleTableClick);

    await renderOrders();
};
