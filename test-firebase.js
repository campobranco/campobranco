
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '.env.development');
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

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
}

console.log('Project:', projectId);
console.log('Email:', clientEmail);
console.log('Key length:', privateKey ? privateKey.length : 0);

try {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey
        })
    });
    const db = admin.firestore();
    db.listCollections().then(cols => {
        console.log('Collections:', cols.map(c => c.id));
        process.exit(0);
    }).catch(err => {
        console.error('List Error:', err);
        process.exit(1);
    });
} catch (err) {
    console.error('Init Error:', err);
    process.exit(1);
}
