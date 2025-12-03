import { getCustomers, getProducts, getOrders, getPayments, addCustomer, addProduct, addOrder, addPayment } from './firebase.js';

const backupBtn = document.getElementById('backup-btn');
const restoreBtn = document.getElementById('restore-btn');
const restoreInput = document.getElementById('restore-input');

const backupData = async () => {
    const [customersSnapshot, productsSnapshot, ordersSnapshot, paymentsSnapshot] = await Promise.all([
        getCustomers(),
        getProducts(),
        getOrders(),
        getPayments()
    ]);

    const customers = customersSnapshot.docs.map(doc => doc.data());
    const products = productsSnapshot.docs.map(doc => doc.data());
    const orders = ordersSnapshot.docs.map(doc => doc.data());
    const payments = paymentsSnapshot.docs.map(doc => doc.data());

    const wb = XLSX.utils.book_new();
    const wsCustomers = XLSX.utils.json_to_sheet(customers);
    const wsProducts = XLSX.utils.json_to_sheet(products);
    const wsOrders = XLSX.utils.json_to_sheet(orders);
    const wsPayments = XLSX.utils.json_to_sheet(payments);

    XLSX.utils.book_append_sheet(wb, wsCustomers, 'Customers');
    XLSX.utils.book_append_sheet(wb, wsProducts, 'Products');
    XLSX.utils.book_append_sheet(wb, wsOrders, 'Orders');
    XLSX.utils.book_append_sheet(wb, wsPayments, 'Payments');

    XLSX.writeFile(wb, 'backup.xlsx');
};

const restoreData = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const customers = XLSX.utils.sheet_to_json(workbook.Sheets['Customers']);
        const products = XLSX.utils.sheet_to_json(workbook.Sheets['Products']);
        const orders = XLSX.utils.sheet_to_json(workbook.Sheets['Orders']);
        const payments = XLSX.utils.sheet_to_json(workbook.Sheets['Payments']);

        try {
            await Promise.all(customers.map(c => addCustomer(c)));
            await Promise.all(products.map(p => addProduct(p)));
            await Promise.all(orders.map(o => addOrder(o)));
            await Promise.all(payments.map(p => addPayment(p)));
            alert('Data restored successfully!');
        } catch (error) {
            console.error('Error restoring data:', error);
            alert('Failed to restore data.');
        }
    };

    reader.readAsArrayBuffer(file);
};


export const initSettings = () => {
    backupBtn.addEventListener('click', backupData);
    restoreBtn.addEventListener('click', () => restoreInput.click());
    restoreInput.addEventListener('change', restoreData);
};
