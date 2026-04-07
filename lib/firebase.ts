/**
 * CONFIGURAÇÃO FIREBASE - CAMPO BRANCO
 * Centraliza a inicialização do Firebase e persistência de dados.
 * O projeto é configurado via variáveis de ambiente (.env.production / .env.development).
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { FIREBASE_CONFIG, FIRESTORE_DATABASE_ID } from './config';

// Inicializa o app apenas uma vez (evita duplicatas em hot-reload do Next.js)
const app: FirebaseApp = !getApps().length ? initializeApp(FIREBASE_CONFIG) : getApp();

// Exporta instância do Auth
const auth: Auth = getAuth(app);

// Configura persistência local explicitamente para manter o usuário logado
if (typeof window !== 'undefined') {
    setPersistence(auth, browserLocalPersistence).catch((err) => {
        console.error('[FIREBASE] Erro ao configurar persistência:', err);
    });
}

export const db: Firestore = getFirestore(app, FIRESTORE_DATABASE_ID);
export { app, auth };
