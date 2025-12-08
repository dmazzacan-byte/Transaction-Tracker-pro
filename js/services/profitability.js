import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getCurrentUser } from '../auth.js';

function getProfitabilityDocId(year, month) {
    const monthString = String(month + 1).padStart(2, '0');
    return `${year}-${monthString}`;
}

export async function getProfitabilityForMonth(year, month) {
    const user = getCurrentUser();
    if (!user) return {};

    const db = getFirestore();
    const docId = getProfitabilityDocId(year, month);
    const docRef = doc(db, 'users', user.uid, 'profitability', docId);

    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data().percentages || {};
        } else {
            return {};
        }
    } catch (error) {
        console.error("Error fetching profitability data:", error);
        return {};
    }
}

export async function saveProfitPercentage(year, month, productId, percentage) {
    const user = getCurrentUser();
    if (!user) return;

    const db = getFirestore();
    const docId = getProfitabilityDocId(year, month);
    const docRef = doc(db, 'users', user.uid, 'profitability', docId);

    try {
        await setDoc(docRef, { percentages: { [productId]: percentage } }, { merge: true });
    } catch (error) {
        console.error("Error saving profit percentage: ", error);
    }
}
