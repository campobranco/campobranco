/**
 * scripts/migrate-collections.ts
 * Script de migração para renomear coleções do Firestore (snake_case -> camelCase)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import path from 'path';

// Carrega variáveis de ambiente
dotenv.config({ path: path.resolve(process.cwd(), '.env.development') });

const rawProjectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
const rawClientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL || '';
const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY || '';

// Limpeza conforme lib/firebase-admin.ts
const projectId = rawProjectId.replace(/^["']|["']$/g, '').trim();
const clientEmail = rawClientEmail.replace(/^["']|["']$/g, '').trim();
let privateKey = rawPrivateKey
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n')
    .trim();

if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}`;
}
if (!privateKey.includes('-----END PRIVATE KEY-----')) {
    privateKey = `${privateKey}\n-----END PRIVATE KEY-----`;
}

if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Erro: Credenciais incompletas no .env.development');
    process.exit(1);
}

console.log(`🔧 Iniciando Admin para projeto: [${projectId}]`);

const app = initializeApp({
    credential: cert({
        project_id: projectId,
        client_email: clientEmail,
        private_key: privateKey,
    } as any),
    projectId
});

const db = getFirestore(app);

const collectionsToMigrate = {
    'shared_lists': 'shared_lists',
    'shared_list_snapshots': 'shared_listsnapshots',
    'witnessing_points': 'witnessing_points',
    'bug_reports': 'bug_reports',
    'error_reports': 'error_reports',
    'security_logs': 'security_logs',
    'lgpd_logs': 'lgpd_logs',
    'lgpd_requests': 'lgpd_requests',
    'notification_templates': 'notification_templates'
};

const subcollectionsMapping: Record<string, string> = {
    'territory_addresses': 'territory_addresses',
    'items': 'items',
    'results': 'results',
    'visits': 'visits'
};

async function migrateCollectionSafe(oldName: string, newName: string) {
    console.log(`\n📦 Migrando: [${oldName}] -> [${newName}]`);

    try {
        const snapshot = await db.collection(oldName).get();
        if (snapshot.empty) {
            console.log(`  - Coleção "${oldName}" está vazia.`);
            return;
        }

        console.log(`  - ${snapshot.size} documentos encontrados.`);

        for (const doc of snapshot.docs) {
            const data = doc.data();
            await db.collection(newName).doc(doc.id).set(data);

            // Subcoleções
            for (const subOldName of Object.keys(subcollectionsMapping)) {
                const subNewName = subcollectionsMapping[subOldName];
                const subSnapshot = await doc.ref.collection(subOldName).get();
                if (!subSnapshot.empty) {
                    console.log(`    - Subcoleção [${subOldName}] -> [${subNewName}] (${subSnapshot.size} docs)`);
                    for (const subDoc of subSnapshot.docs) {
                        await db.collection(newName).doc(doc.id).collection(subNewName).doc(subDoc.id).set(subDoc.data());
                    }
                }
            }
        }
        console.log(`✅ [${oldName}] migrada para [${newName}].`);
    } catch (err: any) {
        console.error(`❌ Erro ao migrar ${oldName}:`, err.message);
    }
}

async function run() {
    console.log('🚀 Executando Migração...');
    for (const [oldName, newName] of Object.entries(collectionsToMigrate)) {
        await migrateCollectionSafe(oldName, newName);
    }
    console.log('\n✨ Fim da migração.');
    process.exit(0);
}

run();
