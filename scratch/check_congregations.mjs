import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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

async function main() {
    try {
        console.log("=== CONGREGATIONS IN FIRESTORE ===");
        const congSnap = await getDocs(collection(db, 'congregations'));
        congSnap.docs.forEach(d => {
            console.log(`ID: ${d.id} | Name: ${d.data().name} | Type: ${d.data().type} | Category: ${d.data().category}`);
        });
        
        console.log("\n=== SHARED LISTS IN FIRESTORE ===");
        const shareSnap = await getDocs(collection(db, 'shared_lists'));
        shareSnap.docs.forEach(d => {
            console.log(`ID: ${d.id} | congId: ${d.data().congregationId} | type: ${d.data().type} | congType: ${d.data().congregationType}`);
        });
    } catch (err) {
        console.error("Error:", err);
    }
}

main();
