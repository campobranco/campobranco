import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
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
const db = getFirestore(app);

async function verifyDeterministicSnapshots() {
    console.log("=== EMPIRICAL VERIFICATION: DETERMINISTIC SNAPSHOT WRITES ===");
    const businessKey = "test_map_001";
    const itemId1 = "item_addr_100";
    const itemId2 = "item_addr_200";

    const snapshotsTable = "shared_list_snapshots";

    // 1. Simula Primeira Gravação com chave determinística
    console.log("\n1. Running First Write for businessKey:", businessKey);
    const snapDocId1 = `${businessKey}_${itemId1}`;
    const snapDocId2 = `${businessKey}_${itemId2}`;

    await setDoc(doc(db, snapshotsTable, snapDocId1), {
        sharedListId: businessKey,
        itemId: itemId1,
        type: 'address',
        data: { street: 'Rua Teste 1', visitStatus: 'none' },
        createdAt: new Date().toISOString()
    });

    await setDoc(doc(db, snapshotsTable, snapDocId2), {
        sharedListId: businessKey,
        itemId: itemId2,
        type: 'address',
        data: { street: 'Rua Teste 2', visitStatus: 'none' },
        createdAt: new Date().toISOString()
    });

    // Consulta documentos pós-primeira gravação
    const q1 = query(collection(db, snapshotsTable), where('sharedListId', '==', businessKey));
    const res1 = await getDocs(q1);
    console.log(`Docs count after 1st write: ${res1.size}`);
    console.log("Doc IDs after 1st write:", res1.docs.map(d => d.id));

    // 2. Simula Segunda Gravação (Reutilização/Re-execução) com a MESMA chave determinística
    console.log("\n2. Running Second Write for SAME businessKey:", businessKey);
    await setDoc(doc(db, snapshotsTable, snapDocId1), {
        sharedListId: businessKey,
        itemId: itemId1,
        type: 'address',
        data: { street: 'Rua Teste 1 Atualizada', visitStatus: 'contacted' },
        createdAt: new Date().toISOString()
    });

    await setDoc(doc(db, snapshotsTable, snapDocId2), {
        sharedListId: businessKey,
        itemId: itemId2,
        type: 'address',
        data: { street: 'Rua Teste 2 Atualizada', visitStatus: 'contacted' },
        createdAt: new Date().toISOString()
    });

    // Consulta documentos pós-segunda gravação
    const res2 = await getDocs(q1);
    console.log(`Docs count after 2nd write: ${res2.size}`);
    console.log("Doc IDs after 2nd write:", res2.docs.map(d => d.id));

    if (res1.size === res2.size && res1.size === 2) {
        console.log("\nSUCCESS: Document count remained EXACTLY 2. Deterministic IDs overwrite atomically with zero duplicate accumulation!");
    } else {
        console.error("FAIL: Document count changed or duplicates created!");
    }
}

verifyDeterministicSnapshots().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
