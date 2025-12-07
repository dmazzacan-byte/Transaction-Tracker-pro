import { db } from '../firebase.js';
import {
    collection,
    doc,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    writeBatch
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getCurrentUser } from '../auth.js';

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

export async function restoreData(data) {
    const user = getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    for (const collectionName in data) {
        const collectionRef = collection(db, `users/${user.uid}/${collectionName}`);

        // Clear existing data
        const existingDocs = await getDocs(collectionRef);
        const deleteBatch = writeBatch(db);
        existingDocs.forEach(doc => deleteBatch.delete(doc.ref));
        await deleteBatch.commit();

        // Add new data
        const addBatch = writeBatch(db);
        data[collectionName].forEach(item => {
            const docRef = doc(collectionRef);
            addBatch.set(docRef, item);
        });
        await addBatch.commit();
    }
}
