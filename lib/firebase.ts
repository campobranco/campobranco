/**
 * CONFIGURAÇÃO FIREBASE - CAMPO BRANCO
 * Centraliza a inicialização do Firebase e persistência de dados.
 * O projeto é configurado via variáveis de ambiente (.env.production / .env.development).
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Configuração do Firebase lida das variáveis de ambiente
// .env.development é automaticamente carregado em dev pelo Next.js
// .env.production é usado no build de produção
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Inicializa o app apenas uma vez (evita duplicatas em hot-reload do Next.js)
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Exporta instância do Auth
const auth: Auth = getAuth(app);

// Configura persistência local explicitamente para manter o usuário logado
if (typeof window !== 'undefined') {
    setPersistence(auth, browserLocalPersistence).catch((err) => {
        console.error('[FIREBASE] Erro ao configurar persistência:', err);
    });
}

// O DATABASE_ID vem da variável de ambiente (.env.local em dev, .env.production em prod).
// Se não especificado na env, cai para '(default)' que é o padrão da maioria dos projetos Firebase
const databaseId = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || '(default)';

export const db: Firestore = getFirestore(app, databaseId);
export { app, auth };
