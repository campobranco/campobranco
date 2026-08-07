import { initializeApp, getApps } from 'firebase/app';
import { initializeFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';
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
    console.log("Connecting to Firestore with LongPolling...");
    const ref = doc(db, 'congregations', 'congregao-bom-pastor');
    console.log("Updating congregao-bom-pastor category -> TRADITIONAL...");
    await updateDoc(ref, {
        category: 'TRADITIONAL'
    });
    const snap = await getDoc(ref);
    console.log("RESULT IN FIRESTORE:", snap.data());
}

run().then(() => {
    console.log("SUCCESS!");
    process.exit(0);
}).catch((err) => {
    console.error("ERROR:", err);
    process.exit(1);
});
