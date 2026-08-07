import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

async function cleanupDuplicateSnapshots() {
    console.log("=== CLEANING UP DUPLICATE SNAPSHOTS IN 'shared_list_items' ===");
    const snap = await getDocs(collection(db, 'shared_list_items'));
    console.log(`Total snapshots before cleanup: ${snap.size}`);

    const seen = new Map();
    const toDelete = [];

    for (const d of snap.docs) {
        const data = d.data();
        const key = `${data.sharedListId}_${data.itemId}`;
        if (seen.has(key)) {
            // Duplicate snapshot found! Mark for deletion
            toDelete.push(d.id);
        } else {
            seen.set(key, d.id);
        }
    }

    console.log(`Found ${toDelete.length} duplicate snapshot documents to delete.`);
    for (const id of toDelete) {
        console.log(`Deleting duplicate snapshot document: ${id}`);
        await deleteDoc(doc(db, 'shared_list_items', id));
    }

    console.log(`=== CLEANUP COMPLETE: Deleted ${toDelete.length} duplicate snapshots ===`);
}

cleanupDuplicateSnapshots().catch(console.error);
