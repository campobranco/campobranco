
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Carregamento simples de env para script local
const envPath = path.join(__dirname, '../.env.development');
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            let value = (match[2] || '').split('#')[0].trim();
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            process.env[match[1]] = value;
        }
    });
}

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
    console.error('ERRO: Variáveis de ambiente faltantes no .env.development');
    process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey
  })
});

const db = admin.firestore();

async function listCollections() {
  console.log(`--- LISTANDO COLEÇÕES [${projectId}] ---`);
  try {
    const collections = await db.listCollections();
    console.log('Coleções encontradas:', collections.map(c => c.id));
    
    // Test a simple get on a known path if possible
    const testDoc = await db.collection('users').limit(1).get();
    console.log('Teste query users:', testDoc.size, 'docs');
  } catch (err) {
    console.error('Erro ao listar coleções:', err);
  }
  process.exit(0);
}

listCollections();
