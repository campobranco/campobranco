import { initializeApp, getApps } from 'firebase/app';
import { initializeFirestore, collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = initializeFirestore(app, {
    experimentalForceLongPolling: true
});

async function runRealFirestoreCheck() {
    console.log("=== CHECKING FIRESTORE SNAPSHOT DOCUMENTS ===");
    const testListId = "boCWEmobfNKXpqoVmnsR";
    const q = query(collection(db, 'shared_list_snapshots'), where('sharedListId', '==', testListId));
    const snap = await getDocs(q);
    console.log(`Total snapshots in Firestore for ${testListId}: ${snap.size}`);
    console.log("Document IDs:");
    snap.docs.forEach(d => console.log(` - ${d.id}`));
}

runRealFirestoreCheck().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
