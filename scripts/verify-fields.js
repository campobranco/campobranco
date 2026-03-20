
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

try {
    require('dotenv').config({ path: path.join(__dirname, '../.env.development') });
    require('dotenv').config({ path: path.join(__dirname, '../.env.production') });
} catch (e) {}

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
let credential;

if (fs.existsSync(serviceAccountPath)) {
    credential = admin.credential.cert(serviceAccountPath);
} else if (projectId && clientEmail && privateKey) {
    credential = admin.credential.cert({ projectId, clientEmail, privateKey });
} else {
    process.exit(1);
}

admin.initializeApp({ credential });
const db = admin.firestore();

async function check() {
    console.log('--- CHECKING USERS ---');
    const uSnap = await db.collection('users').limit(1).get();
    if (!uSnap.empty) {
        console.log('User keys:', Object.keys(uSnap.docs[0].data()));
    }

    console.log('--- CHECKING SHARED_LISTS ---');
    const lSnap = await db.collection('shared_lists').limit(1).get();
    if (!lSnap.empty) {
        console.log('List keys:', Object.keys(lSnap.docs[0].data()));
    }
    
    process.exit(0);
}

check();
