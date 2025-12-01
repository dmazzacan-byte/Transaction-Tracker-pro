import { addOrder, getOrders, updateOrder, deleteOrder, getCustomers, getProducts } from './firebase.js';

const orderModal = document.getElementById('order-modal');
const orderForm = document.getElementById('order-form');
const ordersTableBody = document.querySelector('#orders-table tbody');
const orderModalTitle = document.getElementById('order-modal-title');
const customerSelect = document.getElementById('order-customer');
const productSelect = document.getElementById('order-product');

const openModal = async (title = 'Add Order', order = {}) => {
    orderModalTitle.textContent = title;
    orderForm.reset();
    orderForm['order-id'].value = order.id || '';
    orderForm['order-date'].value = order.date || new Date().toISOString().slice(0, 10);
    orderForm['order-quantity'].value = order.quantity || '';
    orderForm['order-total'].value = order.totalValue || '';
    orderForm['order-paid'].value = order.amountPaid || '';
    orderForm['order-status'].value = order.paymentStatus || 'Pendiente';

    await populateCustomers(order.customerId);
    await populateProducts(order.productId);

    orderModal.style.display = 'block';
};

const closeModal = () => {
    orderModal.style.display = 'none';
};

const populateCustomers = async (selectedCustomerId) => {
    customerSelect.innerHTML = '<option value="">Select Customer</option>';
    const querySnapshot = await getCustomers();
    querySnapshot.forEach(doc => {
        const customer = { id: doc.id, ...doc.data() };
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = customer.name;
        if (customer.id === selectedCustomerId) {
            option.selected = true;
        }
        customerSelect.appendChild(option);
    });
};

const populateProducts = async (selectedProductId) => {
    productSelect.innerHTML = '<option value="">Select Product</option>';
    const querySnapshot = await getProducts();
    querySnapshot.forEach(doc => {
        const product = { id: doc.id, ...doc.data() };
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = product.description;
        if (product.id === selectedProductId) {
            option.selected = true;
        }
        productSelect.appendChild(option);
    });
};


const renderOrders = async () => {
    ordersTableBody.innerHTML = '';
    const [ordersSnapshot, customersSnapshot, productsSnapshot] = await Promise.all([getOrders(), getCustomers(), getProducts()]);

    const customers = {};
    customersSnapshot.forEach(doc => customers[doc.id] = doc.data());

    const products = {};
    productsSnapshot.forEach(doc => products[doc.id] = doc.data());

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
                <td>${order.totalValue}</td>
                <td>${order.amountPaid}</td>
                <td>${order.paymentStatus}</td>
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
        totalValue: parseFloat(orderForm['order-total'].value),
        amountPaid: parseFloat(orderForm['order-paid'].value),
        paymentStatus: orderForm['order-status'].value,
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
        const querySnapshot = await getOrders();
        const doc = querySnapshot.docs.find(doc => doc.id === id);
        if (doc) {
            const order = { id: doc.id, ...doc.data() };
            openModal('Edit Order', order);
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

export const initOrders = () => {
    document.getElementById('add-order-btn').addEventListener('click', () => openModal());
    orderModal.querySelector('.close-button').addEventListener('click', closeModal);
    orderForm.addEventListener('submit', handleFormSubmit);
    ordersTableBody.addEventListener('click', handleTableClick);

    renderOrders();
};