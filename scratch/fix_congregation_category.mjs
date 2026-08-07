import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';
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

async function fixCongregationCategory() {
    console.log("=== FIXING CONGREGATION CATEGORY IN FIRESTORE ===");
    const congRef = doc(db, 'congregations', 'congregao-bom-pastor');
    const snap = await getDoc(congRef);
    if (snap.exists()) {
        console.log("Before update:", snap.data());
        await updateDoc(congRef, {
            category: 'TRADITIONAL',
            updatedAt: new Date().toISOString()
        });
        const updatedSnap = await getDoc(congRef);
        console.log("After update:", updatedSnap.data());
    } else {
        console.error("Document congregao-bom-pastor not found!");
    }
}

fixCongregationCategory().catch(console.error);
