import { db } from '../firebase.js';
import {
    collection,
    doc,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    writeBatch,
    query,
    where,
    limit
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getCurrentUser } from '../auth.js';
import { getProfitabilityForMonth } from './profitability.js';

// ... (keep existing functions: getCollection, fetchData, saveOrUpdate, deleteItem) ...
async function getCollection(collectionName) {
    const user = getCurrentUser();
    if (!user) throw new Error("User not authenticated");
    const collectionRef = collection(db, `users/${user.uid}/${collectionName}`);
    const snapshot = await getDocs(collectionRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function fetchData() {
    const collections = ['products', 'customers', 'orders', 'payments', 'users'];
    const [products, customers, orders, payments, users] = await Promise.all(
        collections.map(getCollection)
    );

    // Backward compatibility for old order data structure
    const normalizedOrders = orders.map(order => {
        if (order.productId && !order.items) {
            return {
                ...order,
                items: [{
                    productId: order.productId,
                    quantity: order.quantity,
                    price: order.total / order.quantity,
                    priceType: 'retail'
                }]
            };
        }
        return order;
    });

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const profitability = await getProfitabilityForMonth(currentYear, currentMonth);

    return { products, customers, orders: normalizedOrders, payments, users, profitability };
}

export async function saveOrUpdate(collectionName, id, data) {
    const user = getCurrentUser();
    if (!user) throw new Error("User not authenticated");
    const collectionRef = collection(db, `users/${user.uid}/${collectionName}`);
    if (id) {
        await updateDoc(doc(collectionRef, id), data);
        return id;
    } else {
        const newDocRef = await addDoc(collectionRef, data);
        return newDocRef.id;
    }
}

export async function deleteItem(collectionName, id) {
    const user = getCurrentUser();
    if (!user) throw new Error("User not authenticated");
    await deleteDoc(doc(db, `users/${user.uid}/${collectionName}`, id));
}


/**
 * Restores data from a backup file intelligently, avoiding duplicates.
 */
export async function restoreData(data) {
    const user = getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const batch = writeBatch(db);

    // --- 1. Fetch Existing Data for Duplicate Checking ---
    const existingData = await fetchData();
    const customerMap = new Map(existingData.customers.map(c => [c.name.toLowerCase(), c.id]));
    const productMap = new Map(existingData.products.map(p => [p.description.toLowerCase(), p.id]));

    // --- 2. Restore Products (if they don't exist) ---
    for (const product of data.products) {
        if (!productMap.has(product.description.toLowerCase())) {
            const newProductRef = doc(collection(db, `users/${user.uid}/products`));
            batch.set(newProductRef, product);
            productMap.set(product.description.toLowerCase(), newProductRef.id); // Add to map for subsequent steps
        }
    }

    // --- 3. Restore Customers (if they don't exist) ---
    for (const customer of data.customers) {
        if (!customerMap.has(customer.name.toLowerCase())) {
            const newCustomerRef = doc(collection(db, `users/${user.uid}/customers`));
            batch.set(newCustomerRef, customer);
            customerMap.set(customer.name.toLowerCase(), newCustomerRef.id); // Add to map
        }
    }

    // Commit products and customers first to ensure they exist for orders/payments
    await batch.commit();
    const finalBatch = writeBatch(db);

    // --- 4. Restore Orders (with reverse lookup and duplicate check) ---
    // Group rows from Excel back into single orders
    const groupedOrders = data.orders.reduce((acc, row) => {
        const orderKey = `${row.customerName}-${row.date}-${row.total.toFixed(2)}`;
        if (!acc[orderKey]) {
            acc[orderKey] = {
                customerName: row.customerName,
                date: row.date,
                total: row.total,
                status: row.status,
                amountPaid: row.amountPaid,
                items: [],
            };
        }
        acc[orderKey].items.push({
            productName: row.productName,
            quantity: row.quantity,
            priceType: row.priceType,
            price: row.price,
        });
        return acc;
    }, {});

    const existingOrderKeys = new Set(existingData.orders.map(o => {
        const customerName = existingData.customers.find(c => c.id === o.customerId)?.name || '';
        const orderDate = new Date(o.date).toISOString().split('T')[0];
        return `${customerName}-${orderDate}-${o.total.toFixed(2)}`;
    }));

    for (const orderKey in groupedOrders) {
        if (existingOrderKeys.has(orderKey)) {
            continue; // Skip duplicate
        }

        const orderData = groupedOrders[orderKey];
        const customerId = customerMap.get(orderData.customerName.toLowerCase());
        if (!customerId) {
            console.warn(`Skipping order for unknown customer: ${orderData.customerName}`);
            continue;
        }

        const items = orderData.items.map(item => {
            const productId = productMap.get(item.productName.toLowerCase());
            if (!productId) {
                throw new Error(`Product "${item.productName}" not found for order.`);
            }
            return {
                productId,
                quantity: item.quantity,
                priceType: item.priceType,
                price: item.price
            };
        });

        const newOrderRef = doc(collection(db, `users/${user.uid}/orders`));
        finalBatch.set(newOrderRef, {
            customerId,
            date: new Date(orderData.date).toISOString(),
            items,
            total: orderData.total,
            status: orderData.status,
            amountPaid: orderData.amountPaid || 0,
        });
    }


    // --- 5. Restore Payments (with reverse lookup and duplicate check) ---
    // Re-fetch orders to include newly added ones for payment mapping
    const allOrders = await getCollection('orders');
    const orderMap = new Map(allOrders.map(o => {
        const customerName = existingData.customers.find(c => c.id === o.customerId)?.name || 'Unknown Customer';
        const key = `Order from ${new Date(o.date).toISOString().split('T')[0]} (Total: ${o.total.toFixed(2)})`;
        return [key, o.id];
    }));

    const existingPayments = new Set(existingData.payments.map(p => `${p.orderId}-${new Date(p.date).toISOString().split('T')[0]}-${p.amount}`));

    for (const payment of data.payments) {
        const orderId = orderMap.get(payment.orderReference);
        if (!orderId) {
            console.warn(`Skipping payment for unknown order: ${payment.orderReference}`);
            continue;
        }

        const paymentKey = `${orderId}-${payment.date}-${payment.amount}`;
        if (existingPayments.has(paymentKey)) {
            continue; // Skip duplicate payment
        }

        const newPaymentRef = doc(collection(db, `users/${user.uid}/payments`));
        finalBatch.set(newPaymentRef, {
            orderId,
            date: new Date(payment.date).toISOString(),
            amount: payment.amount,
            reference: payment.reference,
        });
    }

    await finalBatch.commit();
}
