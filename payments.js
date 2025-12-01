import { addPayment, getPayments, updatePayment, deletePayment, getCustomers, getOrders } from './firebase.js';

const paymentModal = document.getElementById('payment-modal');
const paymentForm = document.getElementById('payment-form');
const paymentsTableBody = document.querySelector('#payments-table tbody');
const paymentModalTitle = document.getElementById('payment-modal-title');
const paymentCustomerSelect = document.getElementById('payment-customer');
const paymentOrderSelect = document.getElementById('payment-order');


const openModal = async (title = 'Add Payment', payment = {}) => {
    paymentModalTitle.textContent = title;
    paymentForm.reset();
    paymentForm['payment-id'].value = payment.id || '';
    paymentForm['payment-date'].value = payment.date || new Date().toISOString().slice(0, 10);
    paymentForm['payment-amount'].value = payment.amount || '';
    paymentForm['payment-reference'].value = payment.reference || '';

    await populateCustomers(payment.customerId);
    await populateOrders(payment.orderId);

    paymentModal.style.display = 'block';
};

const closeModal = () => {
    paymentModal.style.display = 'none';
};

const populateCustomers = async (selectedCustomerId) => {
    paymentCustomerSelect.innerHTML = '<option value="">Select Customer</option>';
    const querySnapshot = await getCustomers();
    querySnapshot.forEach(doc => {
        const customer = { id: doc.id, ...doc.data() };
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = customer.name;
        if (customer.id === selectedCustomerId) {
            option.selected = true;
        }
        paymentCustomerSelect.appendChild(option);
    });
};

const populateOrders = async (selectedOrderId) => {
    paymentOrderSelect.innerHTML = '<option value="">Select Order</option>';
    const querySnapshot = await getOrders();
    querySnapshot.forEach(doc => {
        const order = { id: doc.id, ...doc.data() };
        const option = document.createElement('option');
        option.value = order.id;
        option.textContent = `${order.date} - ${order.totalValue}`; // Simple representation
        if (order.id === selectedOrderId) {
            option.selected = true;
        }
        paymentOrderSelect.appendChild(option);
    });
};

const renderPayments = async () => {
    paymentsTableBody.innerHTML = '';
    const [paymentsSnapshot, customersSnapshot, ordersSnapshot] = await Promise.all([getPayments(), getCustomers(), getOrders()]);

    const customers = {};
    customersSnapshot.forEach(doc => customers[doc.id] = doc.data());

    const orders = {};
    ordersSnapshot.forEach(doc => orders[doc.id] = doc.data());

    paymentsSnapshot.forEach(doc => {
        const payment = { id: doc.id, ...doc.data() };
        const customerName = customers[payment.customerId]?.name || 'N/A';
        const orderInfo = orders[payment.orderId] ? `${orders[payment.orderId].date} - ${orders[payment.orderId].totalValue}` : 'N/A';
        const row = `
            <tr>
                <td>${payment.date}</td>
                <td>${customerName}</td>
                <td>${orderInfo}</td>
                <td>${payment.amount}</td>
                <td>${payment.reference}</td>
                <td class="actions">
                    <a href="#" class="edit-btn" data-id="${payment.id}">Edit</a>
                    <a href="#" class="delete-btn" data-id="${payment.id}">Delete</a>
                </td>
            </tr>
        `;
        paymentsTableBody.innerHTML += row;
    });
};

const handleFormSubmit = async (e) => {
    e.preventDefault();
    const id = paymentForm['payment-id'].value;
    const paymentData = {
        date: paymentForm['payment-date'].value,
        customerId: paymentForm['payment-customer'].value,
        orderId: paymentForm['payment-order'].value,
        amount: parseFloat(paymentForm['payment-amount'].value),
        reference: paymentForm['payment-reference'].value,
    };

    try {
        if (id) {
            await updatePayment(id, paymentData);
        } else {
            await addPayment(paymentData);
        }
        closeModal();
        await renderPayments();
    } catch (error) {
        console.error('Error saving payment:', error);
    }
};

const handleTableClick = async (e) => {
    const target = e.target;
    const id = target.dataset.id;

    if (target.classList.contains('edit-btn')) {
        e.preventDefault();
        const querySnapshot = await getPayments();
        const doc = querySnapshot.docs.find(doc => doc.id === id);
        if (doc) {
            const payment = { id: doc.id, ...doc.data() };
            openModal('Edit Payment', payment);
        }
    } else if (target.classList.contains('delete-btn')) {
        e.preventDefault();
        if (confirm('Are you sure you want to delete this payment?')) {
            try {
                await deletePayment(id);
                await renderPayments();
            } catch (error) {
                console.error('Error deleting payment:', error);
            }
        }
    }
};

export const initPayments = () => {
    document.getElementById('add-payment-btn').addEventListener('click', () => openModal());
    paymentModal.querySelector('.close-button').addEventListener('click', closeModal);
    paymentForm.addEventListener('submit', handleFormSubmit);
    paymentsTableBody.addEventListener('click', handleTableClick);

    renderPayments();
};