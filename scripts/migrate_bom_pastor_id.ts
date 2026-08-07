import { initializeApp, getApps } from 'firebase/app';
import { initializeFirestore, doc, getDoc, setDoc, deleteDoc, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const envPath = path.join(projectRoot, '.env.development');
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
        const [key, ...val] = line.split('=');
        if (key && val.length > 0) {
            let value = val.join('=').trim();
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            process.env[key.trim()] = value;
        }
    });
}

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = initializeFirestore(app, {});

async function runMigration() {
    const oldId = 'congregao-bom-pastor';
    const newId = 'congregacao-bom-pastor';

    console.log(`[MIGRATION] Migrando ID da congregação '${oldId}' -> '${newId}' no projeto ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}...`);

    const oldCongRef = doc(db, 'congregations', oldId);
    const oldCongSnap = await getDoc(oldCongRef);

    if (!oldCongSnap.exists()) {
        console.log(`[MIGRATION] Documento de origem 'congregations/${oldId}' não encontrado.`);
    } else {
        const originalCong = oldCongSnap.data();
        const newCongRef = doc(db, 'congregations', newId);
        await setDoc(newCongRef, {
            ...originalCong,
            updatedAt: new Date().toISOString()
        });
        console.log(`[MIGRATION] Novo documento 'congregations/${newId}' criado com sucesso.`);
    }

    const collections = ['cities', 'users', 'territories', 'addresses', 'witnessing_points', 'shared_lists', 'visits', 'shared_list_snapshots'];
    for (const collName of collections) {
        try {
            const q = query(collection(db, collName), where('congregationId', '==', oldId));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                console.log(`[MIGRATION] Atualizando ${snapshot.size} documento(s) na coleção '${collName}'...`);
                let batch = writeBatch(db);
                let count = 0;
                for (const d of snapshot.docs) {
                    batch.update(d.ref, { congregationId: newId });
                    count++;
                    if (count === 400) {
                        await batch.commit();
                        batch = writeBatch(db);
                        count = 0;
                    }
                }
                if (count > 0) {
                    await batch.commit();
                }
            } else {
                console.log(`[MIGRATION] Nenhum documento com congregationId == '${oldId}' na coleção '${collName}'.`);
            }
        } catch (colErr) {
            console.warn(`[MIGRATION] Aviso ao consultar '${collName}':`, colErr);
        }
    }

    if (oldCongSnap.exists()) {
        console.log(`[MIGRATION] Removendo documento antigo 'congregations/${oldId}'...`);
        await deleteDoc(oldCongRef);
    }

    console.log(`\n✅ MIGRATION CONCLUÍDA COM SUCESSO DE '${oldId}' PARA '${newId}'!`);
}

runMigration().then(() => process.exit(0)).catch(err => {
    console.error("Erro na migração:", err);
    process.exit(1);
});
