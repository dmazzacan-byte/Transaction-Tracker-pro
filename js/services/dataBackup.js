import { getState } from '../state.js';
import { restoreData } from './firestore.js';

/**
 * Creates a human-readable and restorable Excel backup of the application data.
 */
export function backupData() {
    const { products, customers, orders, payments } = getState();

    const customerMap = new Map(customers.map(c => [c.id, c.name]));
    const productMap = new Map(products.map(p => [p.id, p.description]));
    const orderMap = new Map(orders.map(o => [o.id, { date: o.date, customerId: o.customerId, total: o.total }]));

    const formatDate = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString.seconds ? isoString.seconds * 1000 : isoString);
        return date.toISOString().split('T')[0];
    };

    // 1. Products: Exclude ID
    const backupProducts = products.map(({ description, retailPrice, wholesalePrice }) => ({
        description,
        retailPrice,
        wholesalePrice,
    }));

    // 2. Customers: Exclude ID
    const backupCustomers = customers.map(({ name, phone }) => ({
        name,
        phone,
    }));

    // 3. Orders: Flatten items into separate rows for human readability
    const backupOrders = [];
    orders.forEach(order => {
        const commonData = {
            customerName: customerMap.get(order.customerId) || 'Unknown Customer',
            date: formatDate(order.date),
            total: order.total,
            status: order.status,
            amountPaid: order.amountPaid || 0,
        };

        if (Array.isArray(order.items) && order.items.length > 0) {
            order.items.forEach(item => {
                backupOrders.push({
                    ...commonData,
                    productName: productMap.get(item.productId) || 'Unknown Product',
                    quantity: item.quantity,
                    priceType: item.priceType,
                    price: item.price,
                });
            });
        } else {
            // Handle orders with no items
            backupOrders.push({
                ...commonData,
                productName: '',
                quantity: 0,
                priceType: '',
                price: 0,
            });
        }
    });


    // 4. Payments: Make order reference more specific
    const backupPayments = payments.map(payment => {
        const order = orderMap.get(payment.orderId);
        const customerName = order ? (customerMap.get(order.customerId) || 'Unknown Customer') : 'Unknown Customer';
        // Make the reference more unique to avoid ambiguity during restore
        const orderReference = order ? `Order from ${formatDate(order.date)} (Total: ${order.total.toFixed(2)})` : 'Unknown Order';

        return {
            customerName,
            orderReference,
            date: formatDate(payment.date),
            amount: payment.amount,
            reference: payment.reference,
        };
    });

    // Create workbook and export
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(backupProducts), "Products");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(backupCustomers), "Customers");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(backupOrders), "Orders");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(backupPayments), "Payments");

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
            const workbook = XLSX.read(data, {type: 'array', cellDates: true});

            // Change the confirmation message to reflect the new behavior
            if (confirm("This will add data from the backup file. Existing data will not be deleted. Do you want to continue?")) {
                try {
                    const dataToRestore = {
                        products: XLSX.utils.sheet_to_json(workbook.Sheets["Products"]),
                        customers: XLSX.utils.sheet_to_json(workbook.Sheets["Customers"]),
                        orders: XLSX.utils.sheet_to_json(workbook.Sheets["Orders"]),
                        payments: XLSX.utils.sheet_to_json(workbook.Sheets["Payments"]),
                    };
                    await restoreData(dataToRestore);
                    alert("Data restored successfully! The application will now reload.");
                    location.reload(); // Reload to reflect changes
                } catch (error) {
                    console.error("Restore failed:", error);
                    alert(`An error occurred during restore: ${error.message}`);
                }
            }
        };
        reader.readAsArrayBuffer(file);
        restoreInput.value = ''; // Reset input to allow re-uploading the same file
    });
}
