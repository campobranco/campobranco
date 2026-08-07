import { initializeApp, getApps } from 'firebase/app';
import { initializeFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
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
const auth = getAuth(app);
const db = initializeFirestore(app, {
    experimentalForceLongPolling: true
});

async function run() {
    console.log("Authenticating Master Admin via Firebase Auth...");
    // Try sign in as master email if password is known, or test update
    const congRef = doc(db, 'congregations', 'congregao-bom-pastor');
    console.log("Updating congregao-bom-pastor category -> TRADITIONAL...");
    await updateDoc(congRef, {
        category: 'TRADITIONAL'
    });
    const snap = await getDoc(congRef);
    console.log("UPDATED FIRESTORE DATA:", snap.data());
}

run().catch(console.error);
