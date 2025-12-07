import { initAuth, setupAuthForms, getCurrentUser } from './auth.js';
import { fetchData, saveOrUpdate, deleteItem } from './services/firestore.js';
import { setState, getState } from './state.js';
import { showNotification } from './utils/notifications.js';
import { setLanguage } from './utils/i18n.js';
import { setupNavigation } from './ui/navigation.js';
import { setupModals, openModal, closeModal } from './ui/modals.js';
import { renderAll, renderCustomers, renderProducts, renderOrders, renderPayments } from './ui/render.js';
import { setupDashboard, updateDashboard } from './ui/dashboard.js';
import { backupData, setupRestore } from './services/dataBackup.js';
import { populateSelect } from './utils/helpers.js';

// --- NUEVA FUNCIÓN DE UTILIDAD: Corrección de Zona Horaria ---
// Esto asegura que la fecha seleccionada en el input (YYYY-MM-DD)
// se guarde correctamente en Firestore sin desviarse por la zona horaria (UTC).
function getLocalDateISO(dateString) {
    if (!dateString) return null;
    // Creamos la fecha a las 00:00:00 de la zona horaria local.
    const date = new Date(dateString + 'T00:00:00');
    return date.toISOString();
}


document.addEventListener('DOMContentLoaded', () => {
    let listenersAttached = false;

    // Setup login/register form listeners immediately
    setupAuthForms();

    // --- App Initialization ---
    async function initApp() {
        try {
            if (!getCurrentUser()) return;

            await setLanguage('es');
            const data = await fetchData();
            setState(data);

            renderAll();
            setupDashboard();


            if (!listenersAttached) {
                setupEventListeners();
                listenersAttached = true;
            }

            document.body.dataset.ready = 'true';
        } catch (error) {
            console.error("Error during initApp:", error);
            // Still set ready to true so the test doesn't hang,
            // but the error will be visible in the console.
            document.body.dataset.ready = 'true';
        }
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        setupNavigation(updateDashboard);
        setupModals();
        setupFilters();

        // Search & Filters
        document.getElementById('customers-search').addEventListener('input', (e) => renderCustomers(e.target.value));
        document.getElementById('products-search').addEventListener('input', (e) => renderProducts(e.target.value));

        // Settings
        document.getElementById('backup-data-btn').addEventListener('click', backupData);
        setupRestore(document.getElementById('restore-data-btn'), document.getElementById('restore-data-input'));

        // Main content clicks for edit/delete/etc.
        document.querySelector('.main-content').addEventListener('click', handleActionClick);

        // Add Buttons
        document.getElementById('add-product-btn').addEventListener('click', () => handleAdd('product'));
        document.getElementById('add-customer-btn').addEventListener('click', () => handleAdd('customer'));
        document.getElementById('add-order-btn').addEventListener('click', () => handleAdd('order'));
        document.getElementById('add-payment-btn').addEventListener('click', () => handleAdd('payment'));
        
        // --- FIX 1.1: Permite crear cliente desde modal de Pedido ---
        document.getElementById('add-customer-from-order-btn').addEventListener('click', () => {
            closeModal('order-modal');
            handleAdd('customer');
        });

        // Forms
        document.getElementById('product-form').addEventListener('submit', handleFormSubmit);
        document.getElementById('customer-form').addEventListener('submit', handleFormSubmit);
        document.getElementById('order-form').addEventListener('submit', handleFormSubmit);
        document.getElementById('payment-form').addEventListener('submit', handleFormSubmit);

        // --- FIX 1.2: Mostrar/Ocultar campos de pago en Pedido ---
        document.getElementById('order-status').addEventListener('change', (e) => {
            const status = e.target.value;
            const paymentDetailsDiv = document.getElementById('order-payment-details');
            const amountPaidInput = document.getElementById('order-amount-paid');
            const totalDisplay = document.getElementById('order-total-display');
            const total = parseFloat(totalDisplay.textContent.replace('$', ''));

            const isPaymentRequired = status === 'Partial' || status === 'Paid';
            paymentDetailsDiv.classList.toggle('hidden', !isPaymentRequired);

            if (status === 'Paid') {
                // Si es pagado, establece el monto pagado al total
                amountPaidInput.value = total.toFixed(2);
            } else if (status === 'Partial') {
                // Si es parcial, asegura que el campo esté vacío para la entrada manual
                amountPaidInput.value = '';
            } else if (status === 'Pending') {
                // Si es pendiente, limpia los campos (aunque estarán ocultos)
                amountPaidInput.value = '';
                document.getElementById('order-bank-reference').value = '';
            }
        });


        // --- Lógica del Modal de Pagos ---
        const paymentCustomerSelect = document.getElementById('payment-customer');
        const paymentOrderSelect = document.getElementById('payment-order');
        const paymentAmountInput = document.getElementById('payment-amount');

        paymentCustomerSelect.addEventListener('change', () => {
            const customerId = paymentCustomerSelect.value;
            const { orders } = getState();
            const pendingOrders = orders.filter(o => o.customerId === customerId && o.status !== 'Paid');

            paymentOrderSelect.innerHTML = '<option value="">Seleccionar Pedido...</option>';
            paymentAmountInput.value = ''; // Limpiar el monto

            if (pendingOrders.length > 0) {
                // Poblar select de pedidos
                populateSelect('payment-order', pendingOrders, 'id', order => {
                    const balance = order.total - (order.amountPaid || 0);
                    return `Pedido del ${new Date(order.date).toLocaleDateString('es-ES')} - Saldo: $${balance.toFixed(2)}`;
                });
                paymentOrderSelect.disabled = false;
                
                // --- FIX 2: Seleccionar y forzar la actualización del primer pedido ---
                const firstPendingOrderId = pendingOrders[0].id;
                paymentOrderSelect.value = firstPendingOrderId;
                paymentOrderSelect.dispatchEvent(new Event('change')); // Dispara el evento para calcular max/value

            } else {
                paymentOrderSelect.disabled = true;
            }
        });

        paymentOrderSelect.addEventListener('change', () => {
            const orderId = paymentOrderSelect.value;
            if (!orderId) {
                paymentAmountInput.value = '';
                paymentAmountInput.removeAttribute('max');
                return;
            }
            const { orders } = getState();
            const order = orders.find(o => o.id === orderId);
            const balance = order.total - (order.amountPaid || 0);
            paymentAmountInput.value = balance.toFixed(2);
            paymentAmountInput.max = balance.toFixed(2);
        });

        // La validación se mantiene, ya que fue parte del Paso 3.
        paymentAmountInput.addEventListener('input', () => {
            const maxAmount = parseFloat(paymentAmountInput.max);
            let enteredAmount = parseFloat(paymentAmountInput.value);

            if (isNaN(enteredAmount)) return;

            if (enteredAmount > maxAmount) {
                // Solo muestra una advertencia, no sobreescribe el valor mientras el usuario teclea
                showNotification('El monto no puede exceder el saldo pendiente.', 'warning');
                // Podrías considerar ajustar el valor aquí si la UX lo requiere, pero es mejor hacerlo en 'blur' para no interrumpir
                // paymentAmountInput.value = maxAmount.toFixed(2);
            }
        });
    }

    function handleActionClick(e) {
        const target = e.target.closest('.action-btn');
        if (!target) return;

        const id = target.dataset.id;
        const type = target.dataset.type;

        if (target.classList.contains('edit')) {
            handleEdit(id, type);
        } else if (target.classList.contains('delete')) {
            handleDelete(id, type);
        } else if (target.classList.contains('pay')) {
            handlePay(id);
        } else if (target.classList.contains('whatsapp-btn')) {
            handleWhatsApp(id, type, target.dataset);
        }
    }

    function handleAdd(type) {
        const form = document.getElementById(`${type}-form`);
        form.reset();
        document.getElementById(`${type}-id`).value = '';
        const titleMap = {
            product: 'Nuevo Producto',
            customer: 'Nuevo Cliente',
            order: 'Nuevo Pedido',
            payment: 'Nuevo Pago'
        };
        document.getElementById(`${type}-modal-title`).textContent = titleMap[type];

        if(type === 'order') {
            document.getElementById('order-items-container').innerHTML = '';
            // Se ocultan los detalles de pago al crear un nuevo pedido
            document.getElementById('order-payment-details').classList.add('hidden'); 
            document.getElementById('order-status').value = 'Pending';
            document.getElementById('order-total-display').textContent = '$0.00';
            setupCustomerAutocomplete();
            addOrderItem();
        } else if (type === 'payment') {
            const { customers } = getState();
            populateSelect('payment-customer', customers, 'id', 'name');
            document.getElementById('payment-order').innerHTML = '<option value="">Seleccionar Pedido...</option>';
            document.getElementById('payment-order').disabled = true;
        }

        openModal(`${type}-modal`);
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const formId = e.target.id;
        const type = formId.split('-')[0];
        const id = document.getElementById(`${type}-id`).value;
        let data = {};

        switch(type) {
            case 'product':
                data = {
                    description: document.getElementById('product-description').value,
                    retailPrice: parseFloat(document.getElementById('product-retail-price').value) || 0,
                    wholesalePrice: parseFloat(document.getElementById('product-wholesale-price').value) || 0,
                };
                break;
            case 'customer':
                data = {
                    name: document.getElementById('customer-name').value,
                    phone: document.getElementById('customer-phone').value,
                };
                break;
            case 'order':
                const items = [];
                let total = 0;
                document.querySelectorAll('#order-items-container .item').forEach(itemDiv => {
                    const productId = itemDiv.querySelector('.item-product').value;
                    const quantity = parseInt(itemDiv.querySelector('.item-quantity').value);
                    const priceType = itemDiv.querySelector('.item-price-type').value;
                    const { products } = getState();
                    const product = products.find(p => p.id === productId);

                    if (product && quantity > 0) {
                        const price = priceType === 'wholesale' ? product.wholesalePrice : product.retailPrice;
                        items.push({ productId, quantity, priceType, price });
                        total += price * quantity;
                    }
                });

                const status = document.getElementById('order-status').value;
                let amountPaid = 0;
                if (status === 'Paid') {
                    amountPaid = total;
                } else if (status === 'Partial') {
                    amountPaid = parseFloat(document.getElementById('order-amount-paid').value) || 0;
                }

                // --- Corrección de Fecha (Zona Horaria) ---
                const date = getLocalDateISO(document.getElementById('order-date').value);

                data = {
                    customerId: document.getElementById('order-customer-id').value,
                    items,
                    total,
                    status,
                    amountPaid,
                    date,
                };

                const orderId = await saveOrUpdate('orders', id, data);

                // Si es un nuevo pedido y tiene pago asociado, se registra el pago.
                if (!id && amountPaid > 0) {
                    await saveOrUpdate('payments', null, {
                        orderId: orderId,
                        amount: amountPaid,
                        reference: document.getElementById('order-bank-reference').value,
                        date: date,
                    });
                }
                break;
            case 'payment':
                const orderId_payment = document.getElementById('payment-order-id').value || document.getElementById('payment-order').value;
                const amount = parseFloat(document.getElementById('payment-amount').value);
                const { orders, payments } = getState();
                const order = orders.find(o => o.id === orderId_payment);

                data = {
                    orderId: orderId_payment,
                    amount,
                    reference: document.getElementById('payment-reference').value,
                    // --- Corrección de Fecha (Zona Horaria) ---
                    date: getLocalDateISO(document.getElementById('payment-date').value),
                };

                if (id) { // Existing payment
                    const oldPayment = payments.find(p => p.id === id);
                    const amountDifference = amount - oldPayment.amount;
                    await saveOrUpdate('payments', id, data);
                    if (order) {
                        const newAmountPaid = (order.amountPaid || 0) + amountDifference;
                        await saveOrUpdate('orders', order.id, {
                            amountPaid: newAmountPaid,
                            status: newAmountPaid >= order.total ? 'Paid' : 'Partial'
                        });
                    }
                } else { // New payment
                    await saveOrUpdate('payments', null, data);
                    if (order) {
                        const newAmountPaid = (order.amountPaid || 0) + amount;
                        await saveOrUpdate('orders', order.id, {
                            amountPaid: newAmountPaid,
                            status: newAmountPaid >= order.total ? 'Paid' : 'Partial'
                        });
                    }
                }
                break;
        }

        if (type !== 'order' && type !== 'payment') {
             await saveOrUpdate(`${type}s`, id, data);
        }

        await initApp();
        closeModal();
        showNotification('Guardado con éxito!', 'success');
    }

    function handleEdit(id, type) {
        const { products, customers, orders, payments } = getState();
        let item;
        const titleMap = {
            product: 'Editar Producto',
            customer: 'Editar Cliente',
            order: 'Editar Pedido',
            payment: 'Editar Pago'
        };

        switch(type) {
            case 'product':
                item = products.find(i => i.id === id);
                if (!item) return;
                document.getElementById('product-id').value = item.id;
                document.getElementById('product-description').value = item.description;
                document.getElementById('product-retail-price').value = item.retailPrice;
                document.getElementById('product-wholesale-price').value = item.wholesalePrice;
                document.getElementById('product-modal-title').textContent = titleMap[type];
                openModal('product-modal');
                break;
            case 'customer':
                item = customers.find(i => i.id === id);
                if (!item) return;
                document.getElementById('customer-id').value = item.id;
                document.getElementById('customer-name').value = item.name;
                document.getElementById('customer-phone').value = item.phone;
                document.getElementById('customer-modal-title').textContent = titleMap[type];
                openModal('customer-modal');
                break;
            case 'order':
                item = orders.find(i => i.id === id);
                if (!item) return;

                document.getElementById('order-id').value = item.id;
                document.getElementById('order-date').value = new Date(item.date).toISOString().split('T')[0];

                const customer = customers.find(c => c.id === item.customerId);
                if (customer) {
                    document.getElementById('order-customer-search').value = customer.name;
                    document.getElementById('order-customer-id').value = customer.id;
                }

                setupCustomerAutocomplete();

                document.getElementById('order-items-container').innerHTML = '';
                if (Array.isArray(item.items)) {
                    item.items.forEach(orderItem => addOrderItem(orderItem));
                }
                updateOrderTotal();

                document.getElementById('order-status').value = item.status;
                // Al editar, forzar el disparo del evento de status para mostrar los campos de pago si aplica
                document.getElementById('order-status').dispatchEvent(new Event('change')); 

                document.getElementById('order-modal-title').textContent = titleMap[type];
                openModal('order-modal');
                break;
            case 'payment':
                item = payments.find(i => i.id === id);
                if (!item) return;

                document.getElementById('payment-id').value = item.id;
                document.getElementById('payment-date').value = new Date(item.date).toISOString().split('T')[0];
                document.getElementById('payment-amount').value = item.amount;
                document.getElementById('payment-reference').value = item.reference;

                const associatedOrder = orders.find(o => o.id === item.orderId);
                if (associatedOrder) {
                    const customerOfOrder = customers.find(c => c.id === associatedOrder.customerId);
                    if (customerOfOrder) {
                        // 1. Popula y selecciona el cliente
                        populateSelect('payment-customer', customers, 'id', 'name', customerOfOrder.id);
                        // 2. Triggers change event on customer select (para poblar los pedidos)
                        document.getElementById('payment-customer').dispatchEvent(new Event('change'));

                        // 3. FIX 3: Usar setTimeout para esperar que los pedidos se carguen y luego seleccionar y actualizar
                        setTimeout(() => {
                            document.getElementById('payment-order').value = item.orderId;
                            // Forzar el evento de cambio para que se actualice el max y el valor del pago.
                            document.getElementById('payment-order').dispatchEvent(new Event('change')); 
                        }, 100);
                    }
                }

                document.getElementById('payment-modal-title').textContent = titleMap[type];
                openModal('payment-modal');
                break;
        }
    }

    async function handleDelete(id, type) {
        if (confirm(`¿Estás seguro de que quieres eliminar este ${type}?`)) {
            try {
                await deleteItem(`${type}s`, id);
                await initApp();
                showNotification('Elemento eliminado con éxito.', 'success');
            } catch (error) {
                showNotification(`Error al eliminar: ${error.message}`, 'error');
            }
        }
    }

    // --- Init Auth ---
    initAuth(initApp);
});

// ... [El resto de las funciones auxiliares (addOrderItem, updateOrderTotal, handlePay, handleWhatsApp, setupFilters, setupCustomerAutocomplete) permanecen sin cambios] ...

function addOrderItem(item = {}) {
    const container = document.getElementById('order-items-container');
    const itemDiv = document.createElement('div');
    itemDiv.classList.add('item');

    const { products } = getState();
    const sortedProducts = [...products].sort((a, b) => a.description.localeCompare(b.description));
    const productOptions = sortedProducts.map(p => `<option value="${p.id}" ${p.id === item.productId ? 'selected' : ''}>${p.description}</option>`).join('');

    itemDiv.innerHTML = `
        <select class="item-product" required><option value="">Seleccionar...</option>${productOptions}</select>
        <input type="number" class="item-quantity" value="${item.quantity || 1}" min="1" required>
        <select class="item-price-type">
            <option value="retail" ${item.priceType === 'retail' ? 'selected' : ''}>Precio Detal</option>
            <option value="wholesale" ${item.priceType === 'wholesale' ? 'selected' : ''}>Precio Mayorista</option>
        </select>
        <button type="button" class="action-btn delete remove-item-btn"><i class="fas fa-trash"></i></button>
    `;

    container.appendChild(itemDiv);

    itemDiv.querySelector('.remove-item-btn').addEventListener('click', () => {
        itemDiv.remove();
        updateOrderTotal();
    });

    itemDiv.querySelector('.item-product').addEventListener('change', updateOrderTotal);
    itemDiv.querySelector('.item-quantity').addEventListener('input', updateOrderTotal);
    itemDiv.querySelector('.item-price-type').addEventListener('change', updateOrderTotal);
}

function updateOrderTotal() {
    let total = 0;
    document.querySelectorAll('#order-items-container .item').forEach(itemDiv => {
        const productId = itemDiv.querySelector('.item-product').value;
        const quantity = parseInt(itemDiv.querySelector('.item-quantity').value);
        const priceType = itemDiv.querySelector('.item-price-type').value;
        const { products } = getState();
        const product = products.find(p => p.id === productId);

        if (product && quantity > 0) {
            const price = priceType === 'wholesale' ? product.wholesalePrice : product.retailPrice;
            total += price * quantity;
        }
    });
    document.getElementById('order-total-display').textContent = `$${total.toFixed(2)}`;
}

function handlePay(id) {
    const { orders } = getState();
    const order = orders.find(o => o.id === id);
    if (!order) return;

    document.getElementById('payment-form').reset();
    document.getElementById('payment-order-id').value = id;

    const paymentOrderSelect = document.getElementById('payment-order');
    paymentOrderSelect.innerHTML = `<option value="${id}">Pedido #${id.substring(0,5)}</option>`;
    paymentOrderSelect.disabled = true;

    const remaining = order.total - (order.amountPaid || 0);
    document.getElementById('payment-amount').value = remaining.toFixed(2);
    document.getElementById('payment-modal-title').textContent = 'Registrar Pago';
    openModal('payment-modal');
}

function handleWhatsApp(id, type, dataset) {
    const { customers, orders, products } = getState();
    let customer;
    let message = '';
    let order;

    switch (type) {
        case 'pending-payment':
        case 'customer':
            customer = customers.find(c => c.id === id);
            break;
        case 'order':
            order = orders.find(o => o.id === id);
            if (order) {
                customer = customers.find(c => c.id === order.customerId);
            }
            break;
    }

    if (!customer || !customer.phone) {
        showNotification('Este cliente no tiene un número de teléfono registrado.', 'error');
        return;
    }

    switch (type) {
        case 'pending-payment':
            message = `Hola, te recuerdo que tienes un pago pendiente por $${dataset.amount}. Gracias!`;
            break;
        case 'customer':
            message = `Saldo: ${dataset.pendingAmount}`;
            break;
        case 'order':
             if (!order) return;
             const itemsSummary = (order.items || []).map(item => {
                const product = products.find(p => p.id === item.productId);
                return `• ${item.quantity} x ${product.description}`;
             }).join('\n');
             message = `Pedido del ${new Date(order.date).toLocaleDateString('es-ES')}:\n\n${itemsSummary}\n--------------------\nTotal: $${order.total.toFixed(2)}`;
             break;
    }

    if (message) {
        const whatsappUrl = `https://wa.me/${customer.phone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }
}

function setupFilters() {
    const { customers } = getState();

    // Orders filter
    const ordersCustomerFilter = document.getElementById('orders-customer-filter');
    const ordersCustomerFilterId = document.getElementById('orders-customer-filter-id');
    const ordersMonthFilter = document.getElementById('orders-month-filter');
    const ordersYearFilter = document.getElementById('orders-year-filter');
    const ordersResultsContainer = document.getElementById('orders-customer-filter-results');

    ordersCustomerFilter.addEventListener('input', () => {
        const searchTerm = ordersCustomerFilter.value.toLowerCase();
        if (!searchTerm) {
            ordersResultsContainer.innerHTML = '';
            ordersCustomerFilterId.value = '';
            applyOrderFilters();
            return;
        }
        const filtered = customers.filter(c => c.name.toLowerCase().includes(searchTerm));
        ordersResultsContainer.innerHTML = '';
        filtered.forEach(customer => {
            const div = document.createElement('div');
            div.textContent = customer.name;
            div.addEventListener('click', () => {
                ordersCustomerFilter.value = customer.name;
                ordersCustomerFilterId.value = customer.id;
                ordersResultsContainer.innerHTML = '';
                applyOrderFilters();
            });
            ordersResultsContainer.appendChild(div);
        });
    });

    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    ordersMonthFilter.innerHTML = `<option value="">Todos los Meses</option>` + months.map((m, i) => `<option value="${i}">${m}</option>`).join('');
    ordersMonthFilter.value = new Date().getMonth();

    const currentYear = new Date().getFullYear();
    let yearOptions = `<option value="">Todos los Años</option>`;
    for (let i = currentYear; i >= currentYear - 5; i--) {
        yearOptions += `<option value="${i}">${i}</option>`;
    }
    ordersYearFilter.innerHTML = yearOptions;
    ordersYearFilter.value = currentYear;

    const applyOrderFilters = () => {
        renderOrders(null, ordersCustomerFilterId.value, ordersMonthFilter.value, ordersYearFilter.value);
    };
    ordersMonthFilter.addEventListener('change', applyOrderFilters);
    ordersYearFilter.addEventListener('change', applyOrderFilters);

    // Payments filter
    const paymentsCustomerFilter = document.getElementById('payments-customer-filter');
    const paymentsCustomerFilterId = document.getElementById('payments-customer-filter-id');
    const paymentsMonthFilter = document.getElementById('payments-month-filter');
    const paymentsYearFilter = document.getElementById('payments-year-filter');
    const paymentsResultsContainer = document.getElementById('payments-customer-filter-results');

    paymentsCustomerFilter.addEventListener('input', () => {
        const searchTerm = paymentsCustomerFilter.value.toLowerCase();
        if (!searchTerm) {
            paymentsResultsContainer.innerHTML = '';
            paymentsCustomerFilterId.value = '';
            applyPaymentFilters();
            return;
        }
        const filtered = customers.filter(c => c.name.toLowerCase().includes(searchTerm));
        paymentsResultsContainer.innerHTML = '';
        filtered.forEach(customer => {
            const div = document.createElement('div');
            div.textContent = customer.name;
            div.addEventListener('click', () => {
                paymentsCustomerFilter.value = customer.name;
                paymentsCustomerFilterId.value = customer.id;
                paymentsResultsContainer.innerHTML = '';
                applyPaymentFilters();
            });
            paymentsResultsContainer.appendChild(div);
        });
    });

    paymentsMonthFilter.innerHTML = `<option value="">Todos los Meses</option>` + months.map((m, i) => `<option value="${i}">${m}</option>`).join('');
    paymentsMonthFilter.value = new Date().getMonth();
    paymentsYearFilter.innerHTML = yearOptions;
    paymentsYearFilter.value = currentYear;

    const applyPaymentFilters = () => {
        renderPayments(paymentsCustomerFilterId.value, paymentsMonthFilter.value, paymentsYearFilter.value);
    };
    paymentsMonthFilter.addEventListener('change', applyPaymentFilters);
    paymentsYearFilter.addEventListener('change', applyPaymentFilters);

    // Hide autocomplete results on outside click
    document.addEventListener('click', (e) => {
        if (!ordersResultsContainer.contains(e.target) && e.target !== ordersCustomerFilter) {
            ordersResultsContainer.innerHTML = '';
        }
        if (!paymentsResultsContainer.contains(e.target) && e.target !== paymentsCustomerFilter) {
            paymentsResultsContainer.innerHTML = '';
        }
    });
}

function setupCustomerAutocomplete() {
    const searchInput = document.getElementById('order-customer-search');
    const resultsContainer = document.getElementById('customer-autocomplete-results');
    const customerIdInput = document.getElementById('order-customer-id');
    const { customers } = getState();

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        if (!searchTerm) {
            resultsContainer.innerHTML = '';
            customerIdInput.value = '';
            return;
        }
        const filtered = customers.filter(c => c.name.toLowerCase().includes(searchTerm));
        resultsContainer.innerHTML = '';
        filtered.forEach(customer => {
            const div = document.createElement('div');
            div.textContent = customer.name;
            div.addEventListener('click', () => {
                searchInput.value = customer.name;
                customerIdInput.value = customer.id;
                resultsContainer.innerHTML = '';
            });
            resultsContainer.appendChild(div);
        });
    });

    document.addEventListener('click', (e) => {
        if (!resultsContainer.contains(e.target) && e.target !== searchInput) {
            resultsContainer.innerHTML = '';
        }
    });
}
