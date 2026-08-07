import { initializeApp, getApps } from 'firebase/app';
import { initializeFirestore, collection, getDocs, doc, writeBatch, deleteField } from 'firebase/firestore';
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

async function migrateAddressesNotes() {
    console.log("=== MIGRATING LEGACY 'notes' TO 'observations' IN FIRESTORE 'addresses' ===");
    const snap = await getDocs(collection(db, 'addresses'));
    console.log(`Total addresses found: ${snap.size}`);

    let updatedCount = 0;
    const batch = writeBatch(db);

    snap.docs.forEach(d => {
        const data = d.data();
        if (data.notes !== undefined) {
            console.log(`Migrating address ${d.id}: notes="${data.notes}" -> observations`);
            const newObs = data.observations || data.notes || '';
            batch.update(d.ref, {
                observations: newObs,
                notes: deleteField()
            });
            updatedCount++;
        }
    });

    if (updatedCount > 0) {
        await batch.commit();
        console.log(`=== MIGRATION COMPLETE: ${updatedCount} addresses updated ===`);
    } else {
        console.log(`=== MIGRATION COMPLETE: 0 addresses contained legacy 'notes' field ===`);
    }
}

migrateAddressesNotes().then(() => process.exit(0)).catch(err => {
    console.error("Migration error:", err);
    process.exit(1);
});
