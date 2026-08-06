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

async function fixCongregations() {
    console.log("=== FIXING CONGREGATIONS DATA IN FIRESTORE ===");
    const congSnap = await getDocs(collection(db, 'congregations'));
    
    for (const d of congSnap.docs) {
        const data = d.data();
        let updated = false;
        const updatePayload = {};

        // Fix category 'Tradicional' -> 'TRADITIONAL'
        if (data.category === 'Tradicional' || data.category === 'tradicional') {
            updatePayload.category = 'TRADITIONAL';
            updatePayload.type = 'TRADITIONAL';
            updated = true;
        } else if (data.category === 'Língua de Sinais' || data.category === 'sinais' || data.category === 'LS') {
            updatePayload.category = 'SIGN_LANGUAGE';
            updatePayload.type = 'SIGN_LANGUAGE';
            updated = true;
        }

        if (updated) {
            console.log(`Corrigindo documento congregations/${d.id} (${data.name}):`, updatePayload);
            await updateDoc(doc(db, 'congregations', d.id), updatePayload);
        } else {
            console.log(`Documento congregations/${d.id} (${data.name}) já está limpo: category="${data.category}", type="${data.type}"`);
        }
    }
    console.log("=== CORREÇÃO CONCLUÍDA COM SUCESSO ===");
}

fixCongregations().catch(console.error);
