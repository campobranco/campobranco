
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Tenta carregar dotenv se disponível
try {
    require('dotenv').config({ path: path.join(__dirname, '../.env.development') });
    require('dotenv').config({ path: path.join(__dirname, '../.env.production') });
} catch (e) {
    // Silencioso se não tiver dotenv, usaremos o fallback manual abaixo
}

// Fallback: Carregamento manual de env se dotenv falhar
const loadEnvManual = (filename) => {
    const envPath = path.join(__dirname, '../', filename);
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split(/\r?\n/).forEach(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                let value = (match[2] || '').split('#')[0].trim();
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                if (!process.env[match[1]]) process.env[match[1]] = value;
            }
        });
    }
};

loadEnvManual('.env.development');
loadEnvManual('.env.production');

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;

if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
    // Remove aspas se existirem (comum em envs mal formatados)
    if (privateKey.startsWith("'") && privateKey.endsWith("'")) privateKey = privateKey.slice(1, -1);
}

const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');

let credential;

if (fs.existsSync(serviceAccountPath)) {
    console.log('📄 Usando arquivo de credenciais: firebase-service-account.json');
    credential = admin.credential.cert(serviceAccountPath);
} else if (projectId && clientEmail && privateKey) {
    console.log(`🔑 Usando variáveis de ambiente para o projeto: ${projectId}`);
    credential = admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
    });
} else {
    console.error('❌ ERRO: Credenciais não encontradas.');
    console.log('Dica: Certifique-se de que FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY estão no seu .env.development');
    console.log('Ou coloque o arquivo JSON da conta de serviço em: ./firebase-service-account.json');
    process.exit(1);
}

admin.initializeApp({ credential });
const db = admin.firestore();

const collectionsToMigrate = {
    'shared_lists': 'shared_lists',
    'shared_list_snapshots': 'shared_listsnapshots',
    'witnessing_points': 'witnessingPoints',
    'bug_reports': 'bugReports',
    'error_reports': 'errorReports',
    'security_logs': 'securityLogs',
    'lgpd_logs': 'lgpdLogs',
    'lgpd_requests': 'lgpdRequests',
    'notification_templates': 'notificationTemplates',
    'territory_addresses': 'territoryAddresses'
};

const subcollectionsMapping = {
    'items': 'items',
    'results': 'results',
    'visits': 'visits'
};

async function migrateCollectionSafe(oldName, newName) {
    console.log(`\n📦 Migrando: [${oldName}] -> [${newName}]`);

    try {
        const snapshot = await db.collection(oldName).get();
        if (snapshot.empty) {
            console.log(`  - Coleção "${oldName}" está vazia ou não existe.`);
            return;
        }

        console.log(`  - ${snapshot.size} documentos encontrados.`);

        const batchSize = 400;
        let batch = db.batch();
        let count = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const newDocRef = db.collection(newName).doc(doc.id);
            batch.set(newDocRef, data);
            count++;

            // Subcoleções
            for (const subOldName of Object.keys(subcollectionsMapping)) {
                const subNewName = subcollectionsMapping[subOldName];
                const subSnapshot = await doc.ref.collection(subOldName).get();
                if (!subSnapshot.empty) {
                    for (const subDoc of subSnapshot.docs) {
                        const newSubDocRef = newDocRef.collection(subNewName).doc(subDoc.id);
                        batch.set(newSubDocRef, subDoc.data());
                        count++;
                    }
                }
            }

            if (count >= batchSize) {
                await batch.commit();
                batch = db.batch();
                count = 0;
                console.log(`  ... processando lote ...`);
            }
        }

        if (count > 0) await batch.commit();
        console.log(`✅ [${oldName}] migrada com sucesso.`);
    } catch (err) {
        console.error(`❌ Erro em ${oldName}:`, err.message);
    }
}

async function run() {
    console.log('🚀 Iniciando Migração de Dados Firestore...');
    for (const [oldName, newName] of Object.entries(collectionsToMigrate)) {
        await migrateCollectionSafe(oldName, newName);
    }
    console.log('\n✨ Migração concluída com sucesso!');
    process.exit(0);
}

run().catch(err => {
    console.error('💥 Erro fatal:', err);
    process.exit(1);
});
