/**
 * lib/config.ts
 * 
 * Centralização de variáveis de ambiente e parâmetros de configuração global.
 * Isso evita a repetição de fallbacks e facilita a manutenção do projeto,
 * especialmente após migrações de banco de dados ou mudança de domínios.
 */

// --- Firebase Public Config ---
export const FIREBASE_CONFIG = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// --- Firestore Config ---
// Novo padrão pós-migração: o banco 'default' é o oficial.
export const FIRESTORE_DATABASE_ID = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || 'default';

// --- App Metadata ---
export const APP_CONFIG = {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'Campo Branco',
    description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'Gestão de Territórios',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '0.8.0-beta',
    url: process.env.NEXT_PUBLIC_APP_URL || 'campobranco.web.app',
    supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'campobrancojw@gmail.com',
};

// --- Segurança & Redirecionamento ---
export const DOMAIN_REDESIGN = {
    legacy: 'campo-branco.web.app',
    current: 'campobranco.web.app',
};
