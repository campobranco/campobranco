
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Tenta carregar dotenv se disponível
try {
    require('dotenv').config({ path: path.join(__dirname, '../.env.development') });
    require('dotenv').config({ path: path.join(__dirname, '../.env.production') });
} catch (e) {}

// Fallback: Carregamento manual
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

const projectId = 'campobrancodev';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;

if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
    if (privateKey.startsWith("'") && privateKey.endsWith("'")) privateKey = privateKey.slice(1, -1);
}

const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');
if (fs.existsSync(serviceAccountPath)) {
    console.log('📄 Usando arquivo de credenciais: firebase-service-account.json');
    credential = admin.credential.cert(serviceAccountPath);
} else if (projectId && clientEmail && privateKey) {
    console.log(`🔑 Usando variáveis de ambiente para o projeto: ${projectId}`);
    console.log(`📧 Email: ${clientEmail.substring(0, 20)}...`);
    console.log(`🔑 Key Length: ${privateKey.length}`);
    credential = admin.credential.cert({ projectId, clientEmail, privateKey });
} else {
    console.error('❌ ERRO: Credenciais não encontradas.');
    console.log('Project:', projectId);
    console.log('Email:', clientEmail);
    console.log('Key:', privateKey ? 'Present' : 'Missing');
    process.exit(1);
}

admin.initializeApp({ credential });
const db = admin.firestore();

// Mapeamento de campos snake_case -> camelCase
const fieldMapping = {
    'congregation_id': 'congregationId',
    'assigned_to': 'assignedTo',
    'created_at': 'createdAt',
    'updated_at': 'updatedAt',
    'expires_at': 'expiresAt',
    'returned_at': 'returnedAt',
    'is_active': 'isActive',
    'assigned_name': 'assignedName',
    'resident_name': 'residentName',
    'is_deaf': 'isDeaf',
    'is_minor': 'isMinor',
    'is_student': 'isStudent',
    'inactivated_at': 'inactivatedAt',
    'terms_accepted_at': 'termsAcceptedAt'
};

const collectionsToProcess = [
    'users',
    'shared_lists',
    'witnessing_points',
    'cities',
    'territories',
    'addresses',
    'visits'
];

async function migrateFieldsInCollection(collectionName) {
    console.log(`\n🔍 Analisando campos em: [${collectionName}]`);
    
    try {
        const snapshot = await db.collection(collectionName).get();
        if (snapshot.empty) {
            console.log(`  - Vazia.`);
            return;
        }

        let batch = db.batch();
        let count = 0;
        let totalUpdated = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const updates = {};
            let hasChanges = false;

            for (const [oldField, newField] of Object.entries(fieldMapping)) {
                if (data.hasOwnProperty(oldField)) {
                    updates[newField] = data[oldField];
                    updates[oldField] = admin.firestore.FieldValue.delete();
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                batch.update(doc.ref, updates);
                count++;
                totalUpdated++;
            }

            if (count >= 400) {
                await batch.commit();
                batch = db.batch();
                count = 0;
                console.log(`  ... processando lote ...`);
            }
        }

        if (count > 0) await batch.commit();
        console.log(`✅ [${collectionName}]: ${totalUpdated} documentos atualizados.`);
    } catch (err) {
        console.error(`❌ Erro em ${collectionName}:`, err.message);
    }
}

async function run() {
    console.log('🚀 Iniciando Migração de Campos (snake -> camel)...');
    for (const col of collectionsToProcess) {
        await migrateFieldsInCollection(col);
    }
    console.log('\n✨ Todos os campos foram padronizados para camelCase!');
    process.exit(0);
}

run().catch(err => {
    console.error('💥 Erro fatal:', err);
    process.exit(1);
});
