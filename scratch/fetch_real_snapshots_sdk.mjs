import { initializeApp, getApps } from 'firebase/app';
import { initializeFirestore, collection, getDocs, query, where } from 'firebase/firestore';
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

async function run() {
    console.log("=== RAW CLIENT SDK QUERY: shared_list_snapshots ===");
    const q = query(collection(db, 'shared_list_snapshots'), where('sharedListId', '==', 'boCWEmobfNKXpqoVmnsR'));
    const snap = await getDocs(q);
    console.log(`SNAPSHOT_COUNT=${snap.size}`);
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log("RAW_JSON_OUTPUT=");
    console.log(JSON.stringify(results, null, 2));
}

run().then(() => process.exit(0)).catch(err => {
    console.error("SDK_QUERY_ERROR:", err.message);
    process.exit(1);
});
