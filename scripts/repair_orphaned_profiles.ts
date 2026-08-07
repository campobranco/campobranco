import { initializeApp, getApps } from 'firebase/app';
import { initializeFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
const db = initializeFirestore(app, {
    experimentalForceLongPolling: true
});

export async function repairUserProfile(uid: string, email: string, displayName?: string | null) {
    if (!uid || !email) {
        console.error("UID e E-mail são obrigatórios para reparar perfil.");
        return false;
    }

    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
        console.log(`[REPAIR] Usuário ${email} (${uid}) já possui perfil no Firestore.`);
        return true;
    }

    const masterEmail = (process.env.NEXT_PUBLIC_MASTER_EMAIL || '').trim().toLowerCase();
    const isMaster = email.trim().toLowerCase() === masterEmail;
    const userName = (displayName && displayName.trim()) ? displayName.trim() : email.split('@')[0];
    const role = isMaster ? 'ADMIN' : 'PUBLICADOR';

    console.log(`[REPAIR] Criando perfil órfão para ${email} (${uid})...`);
    await setDoc(userRef, {
        name: userName,
        email: email.trim().toLowerCase(),
        role,
        congregationId: null,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
    });

    console.log(`[REPAIR] Perfil criado com sucesso para ${email}!`);
    return true;
}

if (process.argv[1] === __filename) {
    const uid = process.argv[2];
    const email = process.argv[3];
    const name = process.argv[4];

    if (!uid || !email) {
        console.log("Uso: node scripts/repair_orphaned_profiles.ts <uid> <email> [displayName]");
        process.exit(0);
    }

    repairUserProfile(uid, email, name).then(() => process.exit(0)).catch(err => {
        console.error("Erro na reparação:", err);
        process.exit(1);
    });
}
