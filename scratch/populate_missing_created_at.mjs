import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
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

async function populateMissingCreatedAt() {
    console.log("=== CHECKING AND POPULATING MISSING createdAt IN FIRESTORE 'users' ===");
    const snap = await getDocs(collection(db, 'users'));
    console.log(`Total users in collection: ${snap.size}`);

    let updatedCount = 0;
    for (const d of snap.docs) {
        const data = d.data();
        if (!data.createdAt) {
            console.log(`User ${d.id} (${data.email || data.name || 'Sem Email'}) lacks createdAt. Populating now...`);
            await updateDoc(doc(db, 'users', d.id), {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            updatedCount++;
        } else {
            console.log(`User ${d.id} (${data.email || data.name}) already has createdAt:`, data.createdAt);
        }
    }
    console.log(`=== POPULATION COMPLETE: ${updatedCount} users updated ===`);
}

populateMissingCreatedAt().catch(console.error);
