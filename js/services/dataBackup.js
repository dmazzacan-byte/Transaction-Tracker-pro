import { getState } from '../state.js';
import { restoreData } from './firestore.js';

export function backupData() {
    const { products, customers, orders, payments } = getState();

    const wb = XLSX.utils.book_new();
    const ws_products = XLSX.utils.json_to_sheet(products.map(({id, ...rest}) => rest));
    const ws_customers = XLSX.utils.json_to_sheet(customers.map(({id, ...rest}) => rest));
    const ws_orders = XLSX.utils.json_to_sheet(orders.map(({id, ...rest}) => rest));
    const ws_payments = XLSX.utils.json_to_sheet(payments.map(({id, ...rest}) => rest));

    XLSX.utils.book_append_sheet(wb, ws_products, "Products");
    XLSX.utils.book_append_sheet(wb, ws_customers, "Customers");
    XLSX.utils.book_append_sheet(wb, ws_orders, "Orders");
    XLSX.utils.book_append_sheet(wb, ws_payments, "Payments");

    XLSX.writeFile(wb, "backup.xlsx");
}

export function setupRestore(restoreBtn, restoreInput) {
    restoreBtn.addEventListener('click', () => restoreInput.click());
    restoreInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});

            if (confirm("This will overwrite existing data. Are you sure?")) {
                const dataToRestore = {
                    products: XLSX.utils.sheet_to_json(workbook.Sheets["Products"]),
                    customers: XLSX.utils.sheet_to_json(workbook.Sheets["Customers"]),
                    orders: XLSX.utils.sheet_to_json(workbook.Sheets["Orders"]),
                    payments: XLSX.utils.sheet_to_json(workbook.Sheets["Payments"]),
                };
                await restoreData(dataToRestore);
                alert("Data restored successfully!");
                // This should trigger a full app reload/re-init in the main script
            }
        };
        reader.readAsArrayBuffer(file);
    });
}
