
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

async function diagnose() {
  console.log(`--- DIAGNÓSTICO FIRESTORE [${projectId}] ---`);
  
  const testEmail = process.argv[2];
  const testCong = process.argv[3];

  if (!testEmail || !testCong) {
      console.log('Uso: node scripts/diagnose_firestore.js <email> <congregationId>');
      process.exit(0);
  }

  // 1. Check user doc
  const userQuery = await db.collection('users').where('email', '==', testEmail).get();
  if (userQuery.empty) {
    console.log(`Usuário ${testEmail} não encontrado.`);
  } else {
    const userDoc = userQuery.docs[0];
    console.log(`Usuário ${testEmail}:`, userDoc.id, userDoc.data());
  }

  // 2. Check counts for congregation
  console.log(`Checando congregação: ${testCong}`);
  const colls = ['witnessing_points', 'visits', 'addresses', 'shared_lists'];
  for (const coll of colls) {
    const snap = await db.collection(coll).where('congregationId', '==', testCong).limit(1).get();
    console.log(`Coleção ${coll}: ${snap.size ? 'Contém dados ✅' : 'Vazia ou ID incorreto ❌'}`);
  }

  process.exit(0);
}

diagnose().catch(err => {
  console.error(err);
  process.exit(1);
});
