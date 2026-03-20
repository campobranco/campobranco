
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.development') });

const projectId = (process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '').replace(/^["']|["']$/g, '').trim();
const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').replace(/^["']|["']$/g, '').trim();
let privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/^["']|["']$/g, '').replace(/\\n/g, '\n').trim();

console.log('Project ID:', projectId);
console.log('Client Email:', clientEmail);
console.log('Private Key Start:', privateKey.substring(0, 50));

try {
    const app = initializeApp({
        credential: cert({
            projectId,
            clientEmail,
            privateKey,
        } as any),
    });
    const db = getFirestore(app);
    db.collection('users').limit(1).get().then(snap => {
        console.log('Success! Found', snap.size, 'users.');
        process.exit(0);
    }).catch(err => {
        console.error('Firestore Error:', err);
        process.exit(1);
    });
} catch (err) {
    console.error('Init Error:', err);
    process.exit(1);
}
