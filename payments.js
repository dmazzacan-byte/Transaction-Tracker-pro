import { addPayment, getPayments, updatePayment, deletePayment, getCustomers, getOrders } from './firebase.js';

const paymentModal = document.getElementById('payment-modal');
const paymentForm = document.getElementById('payment-form');
const paymentsTableBody = document.querySelector('#payments-table tbody');
const modalTitle = document.getElementById('payment-modal-title');
const customerSelect = document.getElementById('payment-customer');
const orderSelect = document.getElementById('payment-order');

const populateSelect = (selectElement, items, valueField = 'id', textField = 'name') => {
    selectElement.innerHTML = '<option value="">Select an option</option>';
    items.forEach(item => {
        const option = `<option value="${item[valueField]}">${item[textField]}</option>`;
        selectElement.innerHTML += option;
    });
};

const openModal = async (title = 'Add Payment', payment = {}) => {
    modalTitle.textContent = title;
    paymentForm.reset();
    paymentForm['payment-id'].value = payment.id || '';
    paymentForm['payment-date'].value = payment.date || new Date().toISOString().slice(0, 10);
    paymentForm['payment-amount'].value = payment.amount || '';
    paymentForm['payment-reference'].value = payment.reference || '';

    const customersSnapshot = await getCustomers();
    const customers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    populateSelect(customerSelect, customers);
    customerSelect.value = payment.customerId || '';

    const ordersSnapshot = await getOrders();
    const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    populateSelect(orderSelect, orders, 'id', 'id'); // Assuming order ID is descriptive enough
    orderSelect.value = payment.orderId || '';

    paymentModal.style.display = 'block';
};

const closeModal = () => {
    paymentModal.style.display = 'none';
};

const renderPayments = async () => {
    paymentsTableBody.innerHTML = '';
    const [paymentsSnapshot, customersSnapshot] = await Promise.all([getPayments(), getCustomers()]);

    const customers = customersSnapshot.docs.reduce((acc, doc) => ({ ...acc, [doc.id]: doc.data() }), {});

    paymentsSnapshot.forEach(doc => {
        const payment = { id: doc.id, ...doc.data() };
        const customerName = customers[payment.customerId]?.name || 'N/A';
        const row = `
            <tr>
                <td>${payment.date}</td>
                <td>${customerName}</td>
                <td>${payment.orderId}</td>
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
        const doc = await getPayments().then(snapshot => snapshot.docs.find(doc => doc.id === id));
        if (doc) {
            const payment = { id: doc.id, ...doc.data() };
            await openModal('Edit Payment', payment);
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

export const initPayments = async () => {
    document.getElementById('add-payment-btn').addEventListener('click', () => openModal());
    paymentModal.querySelector('.close-button').addEventListener('click', closeModal);
    paymentForm.addEventListener('submit', handleFormSubmit);
    paymentsTableBody.addEventListener('click', handleTableClick);

    await renderPayments();
};
