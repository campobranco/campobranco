import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspectShare() {
    const shareId = 'UuOVVTL1C6k6Qsm5nlkcAQ';
    console.log('--- Inspecting shared_lists/' + shareId + ' ---');
    const shareSnap = await getDoc(doc(db, 'shared_lists', shareId));
    if (!shareSnap.exists()) {
        console.log('shared_list document NOT FOUND!');
        return;
    }
    const shareData = shareSnap.data();
    console.log('shared_list data:', JSON.stringify(shareData, null, 2));

    if (shareData.congregationId) {
        console.log('--- Inspecting congregations/' + shareData.congregationId + ' ---');
        const congSnap = await getDoc(doc(db, 'congregations', shareData.congregationId));
        if (congSnap.exists()) {
            console.log('congregation data:', JSON.stringify(congSnap.data(), null, 2));
        } else {
            console.log('congregation document NOT FOUND!');
        }
    }
}

inspectShare().catch(console.error);
