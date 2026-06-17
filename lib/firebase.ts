/**
 * CONFIGURAÇÃO FIREBASE - CAMPO BRANCO
 * Centraliza a inicialização do Firebase e persistência de dados.
 * O projeto é configurado via variáveis de ambiente (.env.production / .env.development).
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, setPersistence, browserLocalPersistence, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { FIREBASE_CONFIG, FIRESTORE_DATABASE_ID } from './config';

// Inicializa o app apenas uma vez (evita duplicatas em hot-reload do Next.js)
const app: FirebaseApp = !getApps().length ? initializeApp(FIREBASE_CONFIG) : getApp();

// Exporta instância do Auth
const auth: Auth = getAuth(app);

// Conecta o Auth ao emulador local se a variável de ambiente correspondente estiver definida
if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
}

// Configura persistência local explicitamente para manter o usuário logado
if (typeof window !== 'undefined') {
    setPersistence(auth, browserLocalPersistence).catch((err) => {
        console.error('[FIREBASE] Erro ao configurar persistência:', err);
    });
}

const db: Firestore = getFirestore(app, FIRESTORE_DATABASE_ID);

// Conecta o Firestore ao emulador local se a variável de ambiente correspondente estiver definida
if (process.env.FIRESTORE_EMULATOR_HOST) {
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
    connectFirestoreEmulator(db, host, parseInt(port, 10));
}

export { app, auth, db };
