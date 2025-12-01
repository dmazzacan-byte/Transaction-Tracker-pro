import { getProducts, getCustomers, getOrders, getPayments, addProduct, addCustomer, addOrder, addPayment } from './firebase.js';

const backupBtn = document.getElementById('backup-btn');
const restoreBtn = document.getElementById('restore-btn');
const restoreInput = document.getElementById('restore-input');

const backupData = async () => {
    try {
        const [productsSnapshot, customersSnapshot, ordersSnapshot, paymentsSnapshot] = await Promise.all([
            getProducts(),
            getCustomers(),
            getOrders(),
            getPayments()
        ]);

        const products = productsSnapshot.docs.map(doc => doc.data());
        const customers = customersSnapshot.docs.map(doc => doc.data());
        const orders = ordersSnapshot.docs.map(doc => doc.data());
        const payments = paymentsSnapshot.docs.map(doc => doc.data());

        const wb = XLSX.utils.book_new();
        const wsProducts = XLSX.utils.json_to_sheet(products);
        const wsCustomers = XLSX.utils.json_to_sheet(customers);
        const wsOrders = XLSX.utils.json_to_sheet(orders);
        const wsPayments = XLSX.utils.json_to_sheet(payments);

        XLSX.utils.book_append_sheet(wb, wsProducts, "Products");
        XLSX.utils.book_append_sheet(wb, wsCustomers, "Customers");
        XLSX.utils.book_append_sheet(wb, wsOrders, "Orders");
        XLSX.utils.book_append_sheet(wb, wsPayments, "Payments");

        XLSX.writeFile(wb, "backup.xlsx");
    } catch (error) {
        console.error("Error backing up data:", error);
        alert("Failed to backup data. See console for details.");
    }
};

const restoreData = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data);

        const products = XLSX.utils.sheet_to_json(wb.Sheets["Products"]);
        const customers = XLSX.utils.sheet_to_json(wb.Sheets["Customers"]);
        const orders = XLSX.utils.sheet_to_json(wb.Sheets["Orders"]);
        const payments = XLSX.utils.sheet_to_json(wb.Sheets["Payments"]);

        // Note: This is a simple restore. It doesn't handle duplicates.
        const restorePromises = [
            ...products.map(p => addProduct(p)),
            ...customers.map(c => addCustomer(c)),
            ...orders.map(o => addOrder(o)),
            ...payments.map(p => addPayment(p)),
        ];

        await Promise.all(restorePromises);
        alert("Data restored successfully!");

    } catch (error) {
        console.error("Error restoring data:", error);
        alert("Failed to restore data. See console for details.");
    } finally {
        // Reset the input so the user can upload the same file again if needed
        restoreInput.value = '';
    }
};

export const initSettings = () => {
    backupBtn.addEventListener('click', backupData);
    restoreBtn.addEventListener('click', () => restoreInput.click());
    restoreInput.addEventListener('change', restoreData);
};