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

    return { products, customers, orders: normalizedOrders, payments, users };
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
    const existingOrders = existingData.orders.map(o => {
        const customerName = existingData.customers.find(c => c.id === o.customerId)?.name || '';
        const orderDate = new Date(o.date).toISOString().split('T')[0];
        return `${customerName}-${orderDate}-${o.total.toFixed(2)}`;
    });

    for (const order of data.orders) {
        const orderKey = `${order.customerName}-${order.date}-${parseFloat(order.total).toFixed(2)}`;
        if (existingOrders.includes(orderKey)) {
            continue; // Skip duplicate
        }

        const customerId = customerMap.get(order.customerName.toLowerCase());
        if (!customerId) {
            console.warn(`Skipping order for unknown customer: ${order.customerName}`);
            continue;
        }

        // Reconstruct items array
        let items = [];
        try {
            const parsedItems = JSON.parse(order.items);
            if (Array.isArray(parsedItems)) {
                items = parsedItems.map(item => {
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
            }
        } catch (e) {
            console.error("Could not parse items for order:", order, e);
            continue; // Skip if items are malformed
        }

        const newOrderRef = doc(collection(db, `users/${user.uid}/orders`));
        finalBatch.set(newOrderRef, {
            customerId,
            date: new Date(order.date).toISOString(),
            items,
            total: order.total,
            status: order.status,
            amountPaid: order.amountPaid || 0,
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
