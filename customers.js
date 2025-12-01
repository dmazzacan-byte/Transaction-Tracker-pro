import { addCustomer, getCustomers, updateCustomer, deleteCustomer } from './firebase.js';

const customerModal = document.getElementById('customer-modal');
const customerForm = document.getElementById('customer-form');
const customersTableBody = document.querySelector('#customers-table tbody');
const customerModalTitle = document.getElementById('customer-modal-title');

const openModal = (title = 'Add Customer', customer = {}) => {
    customerModalTitle.textContent = title;
    customerForm.reset();
    customerForm['customer-id'].value = customer.id || '';
    customerForm['customer-name'].value = customer.name || '';
    customerForm['customer-phone'].value = customer.phone || '';
    customerModal.style.display = 'block';
};

const closeModal = () => {
    customerModal.style.display = 'none';
};

const renderCustomers = async () => {
    customersTableBody.innerHTML = '';
    const querySnapshot = await getCustomers();
    querySnapshot.forEach(doc => {
        const customer = { id: doc.id, ...doc.data() };
        const row = `
            <tr>
                <td>${customer.name}</td>
                <td>${customer.phone}</td>
                <td>${customer.monthlyVolume || 0}</td>
                <td>${customer.totalVolume || 0}</td>
                <td>${customer.pendingAmount || 0}</td>
                <td class="actions">
                    <a href="#" class="edit-btn" data-id="${customer.id}">Edit</a>
                    <a href="#" class="delete-btn" data-id="${customer.id}">Delete</a>
                </td>
            </tr>
        `;
        customersTableBody.innerHTML += row;
    });
};

const handleFormSubmit = async (e) => {
    e.preventDefault();
    const id = customerForm['customer-id'].value;
    const customerData = {
        name: customerForm['customer-name'].value,
        phone: customerForm['customer-phone'].value,
    };

    try {
        if (id) {
            await updateCustomer(id, customerData);
        } else {
            await addCustomer(customerData);
        }
        closeModal();
        await renderCustomers();
    } catch (error) {
        console.error('Error saving customer:', error);
    }
};

const handleTableClick = async (e) => {
    const target = e.target;
    const id = target.dataset.id;

    if (target.classList.contains('edit-btn')) {
        e.preventDefault();
        const querySnapshot = await getCustomers();
        const doc = querySnapshot.docs.find(doc => doc.id === id);
        if (doc) {
            const customer = { id: doc.id, ...doc.data() };
            openModal('Edit Customer', customer);
        }
    } else if (target.classList.contains('delete-btn')) {
        e.preventDefault();
        if (confirm('Are you sure you want to delete this customer?')) {
            try {
                await deleteCustomer(id);
                await renderCustomers();
            } catch (error) {
                console.error('Error deleting customer:', error);
            }
        }
    }
};


export const initCustomers = () => {
    document.getElementById('add-customer-btn').addEventListener('click', () => openModal());
    customerModal.querySelector('.close-button').addEventListener('click', closeModal);
    customerForm.addEventListener('submit', handleFormSubmit);
    customersTableBody.addEventListener('click', handleTableClick);

    renderCustomers();
};